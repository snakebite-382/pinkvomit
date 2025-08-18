-- MySQL dump 10.13  Distrib 8.0.42, for Linux (x86_64)
-- THIS FILE IS OUT OF DATE AND IS ONLY KEPT AS A REFERENCE, PLEASE USE MIGRATION SYSTEM
--
-- Host: localhost    Database: pinkvomit
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `blogs`
--

DROP TABLE IF EXISTS `blogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userID` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `stylesheet` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `title` (`title`),
  KEY `userID` (`userID`),
  CONSTRAINT `blogs_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_memberships`
--

DROP TABLE IF EXISTS `chat_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `chatID` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blogID` (`blogID`,`chatID`),
  KEY `chatID` (`chatID`),
  CONSTRAINT `chat_memberships_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `chat_memberships_ibfk_2` FOREIGN KEY (`chatID`) REFERENCES `chats` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chats`
--

DROP TABLE IF EXISTS `chats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `postID` int DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `blogID` (`blogID`),
  KEY `postID` (`postID`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`postID`) REFERENCES `posts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `communities`
--

DROP TABLE IF EXISTS `communities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `communities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `blogID` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `title` (`title`),
  KEY `blogID` (`blogID`),
  CONSTRAINT `communities_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `community_comments`
--

DROP TABLE IF EXISTS `community_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `communityPostID` int DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `blogID` (`blogID`),
  KEY `communityPostID` (`communityPostID`),
  CONSTRAINT `community_comments_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `community_comments_ibfk_2` FOREIGN KEY (`communityPostID`) REFERENCES `community_posts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `community_likes`
--

DROP TABLE IF EXISTS `community_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `communityPostID` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blogID` (`blogID`,`communityPostID`),
  KEY `communityPostID` (`communityPostID`),
  CONSTRAINT `community_likes_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `community_likes_ibfk_2` FOREIGN KEY (`communityPostID`) REFERENCES `community_posts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `community_memberships`
--

DROP TABLE IF EXISTS `community_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `communityID` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blogID` (`blogID`,`communityID`),
  KEY `communityID` (`communityID`),
  CONSTRAINT `community_memberships_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `community_memberships_ibfk_2` FOREIGN KEY (`communityID`) REFERENCES `communities` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `community_posts`
--

DROP TABLE IF EXISTS `community_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `communityID` int DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `blogID` (`blogID`),
  KEY `communityID` (`communityID`),
  CONSTRAINT `community_posts_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `community_posts_ibfk_2` FOREIGN KEY (`communityID`) REFERENCES `communities` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `community_replies`
--

DROP TABLE IF EXISTS `community_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `communityCommentID` int DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `blogID` (`blogID`),
  KEY `communityCommentID` (`communityCommentID`),
  CONSTRAINT `community_replies_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `community_replies_ibfk_2` FOREIGN KEY (`communityCommentID`) REFERENCES `community_comments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `follows`
--

DROP TABLE IF EXISTS `follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `follows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `following_blog` int DEFAULT NULL,
  `followed_blog` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `following_blog` (`following_blog`,`followed_blog`),
  KEY `followed_blog` (`followed_blog`),
  CONSTRAINT `follows_ibfk_1` FOREIGN KEY (`following_blog`) REFERENCES `blogs` (`id`),
  CONSTRAINT `follows_ibfk_2` FOREIGN KEY (`followed_blog`) REFERENCES `blogs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `likes`
--

DROP TABLE IF EXISTS `likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `postID` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blogID` (`blogID`,`postID`),
  KEY `postID` (`postID`),
  CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`postID`) REFERENCES `posts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pages`
--

DROP TABLE IF EXISTS `pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blogID` (`blogID`,`title`),
  CONSTRAINT `pages_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` varchar(255) DEFAULT NULL,
  `blogID` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `blogID` (`blogID`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `replies`
--

DROP TABLE IF EXISTS `replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blogID` int DEFAULT NULL,
  `commentID` int DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `blogID` (`blogID`),
  KEY `commentID` (`commentID`),
  CONSTRAINT `replies_ibfk_1` FOREIGN KEY (`blogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `replies_ibfk_2` FOREIGN KEY (`commentID`) REFERENCES `comments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) DEFAULT NULL,
  `userID` int DEFAULT NULL,
  `expiresAt` bigint DEFAULT NULL,
  `selectedBlogID` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `userID` (`userID`),
  KEY `sessions_FK` (`selectedBlogID`),
  CONSTRAINT `sessions_FK` FOREIGN KEY (`selectedBlogID`) REFERENCES `blogs` (`id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `emailVerified` tinyint(1) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'pinkvomit'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-17 21:51:06
