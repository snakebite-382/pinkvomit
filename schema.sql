-- OUT OF DATE
USE `pinkvomit`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `email` varchar(255) UNIQUE,
  `emailVerified` bool,
  `password` varchar(255)
);

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `uuid` varchar(255) UNIQUE,
  `userID` integer,
  `expiresAt` bigint
);

CREATE TABLE IF NOT EXISTS `blogs` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `userID` integer,
  `title` varchar(255) UNIQUE,
  `stylesheet` varchar(255)
);


CREATE TABLE IF NOT EXISTS `pages` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `title` varchar(255),
  `content` varchar(255)
);

ALTER TABLE `pages` ADD CONSTRAINT UNIQUE(`blogID`, `title`);

CREATE TABLE IF NOT EXISTS `posts` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `content` varchar(255),
  `blogID` integer
);

CREATE TABLE IF NOT EXISTS `follows` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `following_blog` integer,
  `followed_blog` integer
);

ALTER TABLE `follows` ADD CONSTRAINT UNIQUE(`following_blog`, `followed_blog`);

CREATE TABLE IF NOT EXISTS `comments` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `postID` integer,
  `content` varchar(255)
);

CREATE TABLE IF NOT EXISTS `replies` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `commentID` integer,
  `content` varchar(255)
);

CREATE TABLE IF NOT EXISTS `likes` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `postID` integer
);


ALTER TABLE `likes` ADD CONSTRAINT UNIQUE(`blogID`, `postID`);

CREATE TABLE IF NOT EXISTS `chats` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `title` varchar(255)
);

CREATE TABLE IF NOT EXISTS `chat_memberships` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `chatID` integer
);

ALTER TABLE `chat_memberships` ADD CONSTRAINT UNIQUE(`blogID`, `chatID`);

CREATE TABLE IF NOT EXISTS `communities` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `title` varchar(255) UNIQUE,
  `description` varchar(255),
  `blogID` integer
);

CREATE TABLE IF NOT EXISTS `community_memberships` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `communityID` integer
);

ALTER TABLE `community_memberships` ADD CONSTRAINT UNIQUE(`blogID`, `communityID`);

CREATE TABLE IF NOT EXISTS `community_posts` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `communityID` integer,
  `content` varchar(255)
);

CREATE TABLE IF NOT EXISTS `community_comments` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `communityPostID` integer,
  `content` varchar(255)
);

CREATE TABLE IF NOT EXISTS `community_replies` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `communityCommentID` integer,
  `content` varchar(255)
);

CREATE TABLE IF NOT EXISTS `community_likes` (
  `id` integer PRIMARY KEY AUTO_INCREMENT,
  `blogID` integer,
  `communityPostID` integer
);

ALTER TABLE `community_likes` ADD CONSTRAINT UNIQUE(`blogID`, `communityPostID`);

ALTER TABLE `sessions` ADD FOREIGN KEY (`userID`) REFERENCES `users` (`id`);

ALTER TABLE `blogs` ADD FOREIGN KEY (`userID`) REFERENCES `users` (`id`);

ALTER TABLE `pages` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `posts` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `follows` ADD FOREIGN KEY (`following_blog`) REFERENCES `blogs` (`id`);

ALTER TABLE `follows` ADD FOREIGN KEY (`followed_blog`) REFERENCES `blogs` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`postID`) REFERENCES `posts` (`id`);

ALTER TABLE `replies` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `replies` ADD FOREIGN KEY (`commentID`) REFERENCES `comments` (`id`);

ALTER TABLE `likes` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `likes` ADD FOREIGN KEY (`postID`) REFERENCES `posts` (`id`);

ALTER TABLE `chat_memberships` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `chat_memberships` ADD FOREIGN KEY (`chatID`) REFERENCES `chats` (`id`);

ALTER TABLE `communities` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `community_memberships` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `community_memberships` ADD FOREIGN KEY (`communityID`) REFERENCES `communities` (`id`);

ALTER TABLE `community_posts` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `community_posts` ADD FOREIGN KEY (`communityID`) REFERENCES `communities` (`id`);

ALTER TABLE `community_comments` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `community_comments` ADD FOREIGN KEY (`communityPostID`) REFERENCES `community_posts` (`id`);

ALTER TABLE `community_replies` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `community_replies` ADD FOREIGN KEY (`communityCommentID`) REFERENCES `community_comments` (`id`);

ALTER TABLE `community_likes` ADD FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`);

ALTER TABLE `community_likes` ADD FOREIGN KEY (`communityPostID`) REFERENCES `community_posts` (`id`);

