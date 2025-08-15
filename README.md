# Welcome to PINKVOMIT, a return to the old web!

This is the development repo for PINKVOMIT.

# Developers

to run this project locally:

* clone the repo to your local machine
* make sure you have nodejs installed
* cd into the project and run `npm install`
* then to run the project just run `npm run dev` and open up localhost:3000
* this will run the project with nodemon so every time you make a change the server hot reloads and you can reload your web browser to view the changes

You will also need to run a mysql server on your machine. To do this:
* install and setup mysql as required for your os
* create a database to use for testing
* create a user that can access that database from localhost using a password
* create a .env file at the root of the project and fill out the required credentials, there is a sample env included
* now just go to the running instance of the project to /testdb and it should say working on the page
