import { Page } from '../types';
import database from '../database';
import { renderMarkdown, sanitizeMarkdown } from '../markdown';
import { escapeHtml } from 'src/validation';

// Nodes for the syntax tree
interface ASTNode {
  type: 'text' | 'tag' | 'root';
  line: number;
  position: { start: number; end: number };
}

interface TextNode extends ASTNode {
  type: 'text';
  content: string;
}

interface TagNode extends ASTNode {
  type: 'tag';
  name: string;
  params: string[];
  children?: ASTNode[];
}

interface RootNode extends ASTNode {
  type: 'root';
  children: ASTNode[];
}

class ErrorableParser {
  private errors: string[] = [];

  protected addError(message: string, line: number): void {
    this.errors.push(`Line ${line}: ${message}`);
  }

  protected getErrors() {
    return this.errors;
  }
}

// Parser Class
class PageParser extends ErrorableParser {
  private content: string;
  private position: number = 0;
  private line: number = 1;

  constructor(content: string) {
    super();
    this.content = content;
  }

  parse(): { ast: RootNode; errors: string[] } {
    const root: RootNode = {
      type: 'root',
      line: 1,
      position: { start: 0, end: this.content.length },
      children: []
    };

    while (this.position < this.content.length) {
      const node = this.parseNext();
      if (node) {
        root.children.push(node);
      }
    }

    return { ast: root, errors: this.getErrors() };
  }

  private parseNext(): ASTNode | null {
    const start = this.position;
    const startLine = this.line;

    if (this.peek() === '[' && !this.isEscaped()) {
      return this.parseTag(start, startLine);
    }

    return this.parseText(start, startLine);
  }

  private parseTag(start: number, startLine: number): TagNode | null {
    this.position++; // Skip '['

    const tagContent: string[] = [];
    let lookingForClose = true;

    while (this.position < this.content.length && lookingForClose) {
      const char = this.peek();

      if (char === '[' && !this.isEscaped()) {
        this.addError("Cannot nest tags", this.line)
      } else if (char === ']' && !this.isEscaped()) {
        lookingForClose = false;
        if (!lookingForClose) break;
      } else if (char === '\n') {
        this.line++;
      }

      tagContent.push(char);
      this.position++;
    }

    if (lookingForClose) {
      this.addError('Unclosed tag', startLine);
      return null;
    }

    this.position++; // Skip closing ']'

    const { name, params } = this.parseTagContent(tagContent.join(''));

    return {
      type: 'tag',
      name,
      params,
      line: startLine,
      position: { start, end: this.position }
    };
  }

  private parseTagContent(content: string): { name: string; params: string[] } {
    const parenIndex = content.indexOf('(');

    if (parenIndex === -1) {
      return { name: content.trim(), params: [] };
    }

    const name = content.substring(0, parenIndex).trim();
    const paramString = content.substring(parenIndex + 1, content.lastIndexOf(')')).trim();
    const params = paramString ? paramString.split(',').map(p => p.trim()) : [];

    if (content.lastIndexOf(')') !== content.indexOf(')')) {
      this.addError("Extra closing parenthesis", this.line);
    }

    if (content.lastIndexOf('(') !== content.indexOf('(')) {
      this.addError("Extra opening parenthesis", this.line);
    }

    return { name, params };
  }

  private parseText(start: number, startLine: number): TextNode {
    const textContent: string[] = [];

    while (this.position < this.content.length) {
      const char = this.peek();

      if (char === '[' && !this.isEscaped()) {
        break;
      }

      if (char === '\n') {
        this.line++;
      }

      if (char === '\\' && this.peek(1) === '[') {
        this.position++; // Skip escape character
      }

      textContent.push(char);
      this.position++;
    }

    return {
      type: 'text',
      content: textContent.join(''),
      line: startLine,
      position: { start, end: this.position }
    };
  }

  private peek(offset: number = 0): string {
    return this.content[this.position + offset] || '';
  }

  private isEscaped(): boolean {
    if (this.position === 0) return false;
    return this.content[this.position - 1] === '\\';
  }

}

// Renderer Class with Proper State Management
class PageRenderer extends ErrorableParser {
  private readonly maxDepth = 10;
  private readonly maxLength = 65536;

  async render(
    page: Page,
    blogTitle: string,
    context: RenderContext = new RenderContext()
  ): Promise<{ html: string; errors: string[] }> {
    if (context.hasRenderedPage(page.id)) {
      this.addError(`Circular reference detected: ${page.title}`, 1)
      return {
        html: '',
        errors: this.getErrors()
      };
    }

    if (context.depth >= this.maxDepth) {
      this.addError(`Maximum nesting depth (${this.maxDepth}) exceeded`, 1);
      return {
        html: '',
        errors: this.getErrors()
      };
    }

    const sanitized = sanitizeMarkdown(page.content);
    const markdownRendered = renderMarkdown(sanitized);
    const parser = new PageParser(markdownRendered);
    const { ast, errors: parserErrors } = parser.parse();

    const renderContext = context.createChild(page.id);

    const renderResult = await this.renderNode(ast, page, blogTitle, renderContext);

    if (renderContext.getSectionDepth() > 0) {
      this.addError(`Unclosed section tag`, ast.line)
    }

    return {
      html: renderResult.html,
      errors: [...parserErrors, ...renderResult.errors, ...this.getErrors()]
    };
  }

  private async renderNode(
    node: ASTNode,
    page: Page,
    blogTitle: string,
    context: RenderContext
  ): Promise<{ html: string; errors: string[] }> {
    switch (node.type) {
      case 'text':
        context.addLength((node as TextNode).content.length);
        return { html: (node as TextNode).content, errors: [] };

      case 'tag':
        return this.renderTag(node as TagNode, page, blogTitle, context);

      case 'root':
        return this.renderChildren((node as RootNode).children, page, blogTitle, context);

      default:
        this.addError(`Unkown node type ${node.type}`, node.line)
        return { html: '', errors: [] };
    }
  }

  private async renderChildren(
    children: ASTNode[],
    page: Page,
    blogTitle: string,
    context: RenderContext
  ): Promise<{ html: string; errors: string[] }> {
    const results = await Promise.all(
      children.map(child => this.renderNode(child, page, blogTitle, context))
    );

    return {
      html: results.map(r => r.html).join(''),
      errors: []
    };
  }

  private async renderTag(
    tag: TagNode,
    page: Page,
    blogTitle: string,
    context: RenderContext
  ): Promise<{ html: string; errors: string[] }> {
    switch (tag.name) {
      case 'posts':
        return this.renderPosts(tag, blogTitle, context);

      case 'include':
        return this.renderInclude(tag, page, blogTitle, context);

      case 'section':
        return this.renderSection(tag, page, blogTitle, context);

      case 'nav':
        return this.renderNav(tag, page, blogTitle, context);

      case 'end':
        return this.renderEnd(tag, page, blogTitle, context);

      default:
        this.addError(`Unknown tag ${tag.name}`, tag.line)
        return {
          html: '',
          errors: []
        };
    }
  }

  private async renderPosts(
    tag: TagNode,
    blogTitle: string,
    context: RenderContext
  ): Promise<{ html: string; errors: string[] }> {
    if (context.hasRenderedPosts()) {
      this.addError(`Posts can only be rendered once`, tag.line)
      return {
        html: '',
        errors: []
      };
    }

    context.markPostsRendered();
    const minimal = tag.params.includes('minimal');

    const { renderBlogsPosts } = await import('../posts/render');

    return {
      html: renderBlogsPosts(blogTitle, minimal),
      errors: []
    };
  }

  private async renderInclude(
    tag: TagNode,
    page: Page,
    blogTitle: string,
    context: RenderContext
  ): Promise<{ html: string; errors: string[] }> {
    const [includePageTitle] = tag.params;

    if (!includePageTitle) {
      this.addError(`Include tag requires a page title`, tag.line)
      return {
        html: '',
        errors: []
      };
    }

    if (context.hasRenderedPageTitle(includePageTitle)) {
      this.addError(`Page "${includePageTitle}" has already been included`, tag.line)
      return {
        html: '',
        errors: []
      };
    }

    const [pages] = await database.query(
      "SELECT * FROM pages WHERE BINARY title = ? AND blogID = ?",
      [includePageTitle, page.blogID]
    ) as [Page[], any];

    if (pages.length === 0) {
      this.addError(`Page "${includePageTitle}" not found`, tag.line);
      return {
        html: '',
        errors: []
      };
    }

    const childRenderer = new PageRenderer();
    const result = await childRenderer.render(pages[0], blogTitle, context);

    if (context.currentLength + result.html.length > this.maxLength) {
      this.addError(`Including page "${includePageTitle}" would exceed maximum page length (${this.maxLength})`, tag.line)
      return {
        html: '',
        errors: []
      };
    }

    context.addLength(result.html.length);
    return result;
  }

  private async renderSection(
    tag: TagNode,
    page: Page,
    blogTitle: string,
    context: RenderContext
  ): Promise<{ html: string; errors: string[] }> {
    const classes = tag.params.join(' ');

    if (context.getSectionDepth() + 1 > this.maxDepth) {
      this.addError(`Adding section would exceed maximum section depth (${this.maxDepth})`, tag.line);
      return {
        html: '',
        errors: []
      }
    }

    context.pushSection(tag);

    return {
      html: `<div class="${escapeHtml(classes)}">`,
      errors: []
    };
  }

  private async renderEnd(
    tag: TagNode,
    page: Page,
    blogTitle: string,
    context: RenderContext
  ): Promise<{ html: string; errors: string[] }> {

    if (context.popSection()) {
      return {
        html: `</div>`,
        errors: []
      }
    }

    this.addError(`Closing tag "end" with no opening tag "section"`, tag.line);
    return {
      html: '',
      errors: []
    }
  }

  private async renderNav(
    tag: TagNode,
    page: Page,
    blogTitle: string,
    context: RenderContext
  ): Promise<{ html: string; errors: string[] }> {
    const errors: string[] = [];
    const navId = crypto.randomUUID();

    // Validate all pages exist and can be rendered
    const validationResults = await Promise.all(
      tag.params.map(async (pageTitle) => {
        const [pages] = await database.query(
          "SELECT * FROM pages WHERE BINARY title = ? AND blogID = ?",
          [pageTitle, page.blogID]
        ) as [Page[], any];

        if (pages.length === 0) {
          return {
            title: pageTitle,
            valid: false,
            error: `Page "${pageTitle}" not found`
          };
        }

        const testContext = context.createChild();
        const renderer = new PageRenderer();
        const { errors: renderErrors } = await renderer.render(
          pages[0],
          blogTitle,
          testContext
        );

        if (renderErrors.length > 0) {
          return {
            title: pageTitle,
            valid: false,
            error: `Page "${pageTitle}" has errors: ${renderErrors.join(', ')}`
          };
        }

        return { title: pageTitle, valid: true, error: null };
      })
    );

    validationResults.forEach(result => {
      if (!result.valid && result.error) {
        this.addError(result.error, tag.line);
      }
    });

    if (errors.length > 0) {
      return { html: '', errors: [] };
    }

    const contextState = context.serialize();
    const html = this.generateNavHtml(navId, tag.params, page, blogTitle, contextState);

    return { html, errors: [] };
  }

  private generateNavHtml(
    navId: string,
    pageTitles: string[],
    page: Page,
    blogTitle: string,
    contextState: string
  ): string {
    const items = pageTitles.map((title, index) => `
      <li id="page-nav-item_${escapeHtml(title)}" class="page-nav-item-for_${navId}">
        <form 
          hx-post="/pages/api/navigate/"
          hx-trigger="click${index === 0 ? ', load' : ''}"
          hx-target="#page-nav-result-for_${navId}"
          hx-swap="innerHTML"
        >
          <input type="hidden" name="contextState" value="${escapeHtml(contextState)}">
          <input type="hidden" name="title" class="page-nav-item-title" value="${escapeHtml(title)}">
          <input type="hidden" name="blogID" value="${escapeHtml(page.blogID as string)}">
          <input type="hidden" name="blogTitle" value="${escapeHtml(blogTitle)}">
          <input type="hidden" name="navId" value="${navId}">
          <a href="#${escapeHtml(title)}" onclick="event.preventDefault()">${escapeHtml(title)}</a>
        </form>
      </li>
    `).join('');

    return `
      <ul id="page-nav_${navId}" class="pagesNav">
        ${items}
      </ul>
      <div id="page-nav-result-for_${navId}" class="page-nav-result"></div>
    `;
  }

}

// Render Context for State Management
export class RenderContext {
  private renderedPages: Set<string> = new Set();
  private renderedPageTitles: Set<string> = new Set();
  private postsRendered: boolean = false;
  public currentLength: number = 0;
  public depth: number = 0;
  private sectionStack: TagNode[] = [];

  constructor(parent?: RenderContext) {
    if (parent) {
      this.renderedPages = new Set(parent.renderedPages);
      this.renderedPageTitles = new Set(parent.renderedPageTitles);
      this.postsRendered = parent.postsRendered;
      this.currentLength = parent.currentLength;
      this.depth = parent.depth + 1;
    }
  }

  createChild(pageId?: string): RenderContext {
    const child = new RenderContext(this);
    if (pageId) {
      child.renderedPages.add(pageId);
    }
    return child;
  }

  hasRenderedPage(pageId: string): boolean {
    return this.renderedPages.has(pageId);
  }

  hasRenderedPageTitle(title: string): boolean {
    return this.renderedPageTitles.has(title);
  }

  hasRenderedPosts(): boolean {
    return this.postsRendered;
  }

  markPostsRendered(): void {
    this.postsRendered = true;
  }

  addLength(length: number): void {
    this.currentLength += length;
  }

  pushSection(tag: TagNode): boolean {
    if (tag.name === "section") {
      this.sectionStack.push(tag);
      return true;
    }

    return false;
  }

  popSection(): TagNode | undefined {
    return this.sectionStack.pop() as TagNode;
  }

  getSectionDepth(): number {
    return this.sectionStack.length;
  }

  peekSection(): TagNode {
    return this.sectionStack[this.sectionStack.length - 1];
  }

  serialize(): string {
    return Buffer.from(JSON.stringify({
      renderedPages: Array.from(this.renderedPages),
      renderedPageTitles: Array.from(this.renderedPageTitles),
      postsRendered: this.postsRendered,
      currentLength: this.currentLength,
      depth: this.depth
    })).toString('base64');
  }

  static deserialize(data: string): RenderContext {
    const parsed = JSON.parse(Buffer.from(data, 'base64').toString());
    const context = new RenderContext();
    context.renderedPages = new Set(parsed.renderedPages);
    context.renderedPageTitles = new Set(parsed.renderedPageTitles);
    context.postsRendered = parsed.postsRendered;
    context.currentLength = parsed.currentLength;
    context.depth = parsed.depth;
    return context;
  }
}

export async function renderPage(
  page: Page,
  blogTitle: string,
  presanitized: boolean = true,
  context: RenderContext = new RenderContext()
): Promise<[string, string[]]> {
  const renderer = new PageRenderer();

  const pageToRender = presanitized ? page : {
    ...page,
    content: sanitizeMarkdown(page.content)
  };

  const { html, errors } = await renderer.render(pageToRender, blogTitle, context);

  if (context.getSectionDepth() > 0) {
    errors.push(`${context.getSectionDepth()} unclosed section tag(s)`);
  }

  return [html, errors];
}
