# CodePod: coding on a canvas, organized.

Codepod provides the interactive coding experience popularized by Jupyter, but
with scalability and production-readiness. Users can still incrementally build
up code by trying out a small code snippet each time. But they would not be
overwhelmed by the great number of code snippets as the projects grow. Try
it online at https://codepod.io !

![screenshot](./screenshot-canvas.png)

# We are on Beta testing

And we are actively polishing everything. You might want to take a look at the
[known
issues](<https://github.com/codepod-io/codepod/wiki/Known-Issues-(and-we-are-fixing-them!)>)
along your adventure with Codepod.

# Contributing

CodePod is open source under MIT license. Feel free to contribute! We can make
it better together. You can contribute by opening an issue, discussion, or
submit a pull request. Please use [Prettier](https://prettier.io/) (e.g., [its
VSCode
plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode))
to format your code before checking in.

# Developing CodePod using docker-compose

The docker compose files are in `compose/dev` folder. The `dev` stack mounts the
`src` folder, so that you can edit the files on your local computer, and let the
node.js process inside the container do the compiling and hot-reloading.

To install docker-compose, follow [this official instruction](https://docs.docker.com/compose/install/linux/).

First, create a `dev/.env` file with the following content (leave as is or change the value to
whatever you want). You probably don't need the GOOGLE_CLIENT_ID is you don't need Google's OAuth.

```
POSTGRES_USER=myusername
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=mydbname
JWT_SECRET=mysupersecretjwttoken
GOOGLE_CLIENT_ID=<google oauth client id>
```

Start the stack:

```
cd dev
docker compose up -d
```

You need to initialized the database if this is the first time to start the stack. See below.

Wait a few minutes for packages installation and compilation. Once `ui` and
`api` containers are ready listening on http ports, go to `http://localhost:80`
to see the app.

- `http://localhost:80/graphql`: Apollo GraphQL explorer for the backend APIs
- `http://prisma.127.0.0.1.sslip.io`: Prisma Studio for viewing and debugging the database.

## Initialize the database

If this is your first time running it, the database is empty, and you need to
initialize the database. To do that, open a shell into the API container and run:

```
npx prisma migrate dev
```

This command is also needed after the database schema is changed. The protocol is:

- One developer changed [the schema](./api/prisma/schema.prisma). He will run
  `npx prisma migrate dev --name add_a_new_field`. This will generate a
  migration, e.g. [this
  migration](./api/prisma/migrations/20221206194247_add_google_login/migration.sql).
  The schema change along with this migration need to be checked in to git.
- Another developer pull the change, then run `npx prisma migrate dev` (in the
  api container's shell) to apply the schema change.

## Auto-completion & Linting

Although we develop using docker, we still want auto-complete and linting while
coding. For that to work, you need to install the node packages locally, i.e.,
run `yarn` in `api/`, `ui/`, etc.
