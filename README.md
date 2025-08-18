# Welcome to PINKVOMIT, a return to the old web!

This is the development repo for PINKVOMIT.

# Documentation

## Installation

To run this project you will need the following locally installed:

### Required

* Node and NPM 
* MySql 

### Optional but recommended 
* An sql workbench (I use dbeaver, it's universal and works with MySql, it's also free)

### Guide

1) clone the git repo to your local machine
2) in your terminal, navigate to the repo and run `npm install`
4) create a local mysql database (setting up your database can either be done through the CLI or through a GUI like dbeaver)
5) create a database user that can access your local database using a password
6) use the schema.sql file to setup the schema in your database (THIS WILL SOON BE REPLACED WITH PROPER MIGRATIONS)
7) create a .env file following the format of the .env.example file 

## Running

To run the project simply run `npm run dev` while in the project directory and go to [localhost:3000](http://localhost:3000/) in your web browser

## Contributing

When contributing changes:

1) Create a new local branch, make sure it is unique from other existing branch names
2) Make changes and commit them to your feature branch (please make small commits with descriptive commit messages)
3) Push your changes to the repo
4) Create a pull request to pull your changes into either main or another feature branch if it's a part of a larger featureset still in development
5) Answer questions, make changes, etc until your changes are either rejected or pulled into the requested branch

## Overview

This project uses an express.js server to serve ejs templates using htmx for quality of life.
The database uses MySql with the node MySql2 driver to write queries in plain SQL.

### Express

#### Routing

Each collection of routes should have a folder with a router.js file which exports a router. That router is then imported into the server.js entry point and used by the main router. Any API endpoints needed for those pages should be in a seperate router.js in an api directory. Routers should have the same route name as their parent directory.

For example all routes related to authentication (login, logout, signup) are in a router.js file in /auth.

When that router is added to the main router it is under the "/auth" route (so they can be accessed at /auth/login, /auth/logout, /auth/signup etc)

The api endpoints to perform the login, logout, and signup actions are in a router.js in /auth/api and those endpoints are then accessed at /auth/api/endpointname

##### HTTP Verbs

| Verb | Usage |
|------|-------|
| Get  | Get a resource (render a page) |
| Post | Creates a resource in the database (also used to validate form inputs) | 
| Put  | Updates a resource in the database |
| Delete | Deletes a resource in the database | 

##### Static files

static files can be found in /public/*

| Directory | URL | Filetypes | Description |
|-----------|-----|-----------|-------------|
| js | /js | .js | Javascript files |
| css | /css |.css | CSS files (main.css is included on every page as the first stylesheet loaded) |
| img | /img | .png, .jpg, .svg, .gif, .webp, .ico | Static image files (Does not contain user uploaded images) | 
| / | / | .ico | should only contain favicon.ico, nothing else |

#### Req object variables

All variables added to the Req object by middleware need to always be defined (this is why the authenticate middleware just sets an auth variable instead of directly protecting routes and is used on all routes). 

##### Variables

| Name | Type | Description | Added by |
|------|------|-------------|----------|
| user | Object or Null | The user object from the database if the user is logged in, null if they are not logged in (NOT FOR AUTHENTICATION) | fetchUser |
| blogs | Array | A list of blogs belonging to the current user, an empty array could mean they are logged out, or are a new user with no blogs | fetchUser |
| selectedBlog | Object or Null | The current blog selected by the active session, or Null if no blogs or logged out | fetchUser |
| authed | bool | Whether the user is logged in with a valid session (THIS IS THE ONLY VALUE THAT SHOULD BE USED TO CHECK IF A USER IS AUTHENTICATED) | authenticate |
| token | Object or Null | The verified and decoded JWT if the user is logged in, null if logged out (NOT FOR AUTHENTICATION) | authenticate |

### EJS

All pages should be in the views folder in a subfolder based on their routing (e.g. the page for /auth/login should be in /views/auth/login.ejs). All partials need to be in the partials folder, subfolders are up to personal preference. All pages need to include the head partial, and nav partial. These partials need to be coded to work with every possible page. All pages should be rendered with the render function in templating.js as this adds all the normally available variables while allowing you to add per page variables as well.

#### Available Variables

| Name | Type | Description |
|------|------|-------------|
| authed | See req.authed | The value of req.authed |
| token | See req.token | The value of req.token |
| user | See req.user | The value of req.user |
| blogs | See req.blogs | The value of req.blogs |
| selectedBlog | See req.selectedBlog | The value of req.selectedBlog |
| title | String | An uppercased version of the string passed into the title parameter of the render function |

### HTMX

The point of htmx is to allow any html element to send http requests and to control how the responses are handled by targeting different elements in the DOM to swap with the response with. Because of this all API endpoints should return valid html contained in a div with an id of "last-word-in-api-route"-result (for example /auth/api/login should return a div with id="login-result"). The response div should also have a class to communicate the status of the request. The only exception is unauthorized requests can simply be send a 401 status code and an optional message of "UNAUTH". All response classes should have a universal styling specified in main.css

#### Response classes

| Class | Meaning | Equivalent HTTP status code |
|-------|---------|-----------------------------|
| success | The request was a success | 200 |
| error | Generic error | 4xx or 5xx |
| warning | Generic warning | 200 or 4xx |

## TODO (in no particular order)
- [ ] add a nice logger
- [ ] add an admin dashboard
- [ ] Make it pretty
- [ ] Move most of the info in the readme to the wiki tab
- [x] Make all API endpoints compliant with HTMX requirements
- [x] Make all HTTP verbs compliant
- [ ] Switch to using [mysql-migrations](https://www.npmjs.com/package/mysql-migrations)
- [ ] Allow logout
- [ ] Allow blog deletion
- [ ] Add limit of 10 blogs per account
- [ ] Add post creation
- [ ] Show posts in a timeline
- [ ] Create profile pages for blogs
- [ ] Allow following blogs
- [ ] Show posts from followed blogs in timeline
- [ ] Add likes
- [ ] Add comments 
- [ ] Add replies
- [ ] Add page creation (See PAGES.md for writeup)
- [ ] Allow editing of blog stylesheet using our GUI builder or by inputting your own custom css

