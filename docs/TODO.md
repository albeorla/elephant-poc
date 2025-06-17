# Project TODO

## Documentation Updates
- [ ] Expand `README.md` with setup instructions for development, database migrations, and running tests.
- [ ] Document all required environment variables in `.env.example`, including `TODOIST_API_KEY`.
- [ ] Add a section describing the Todoist integration and link to `docs/TODOIST_INTEGRATION.md`.
- [ ] Provide a short guide for running the Vitest suite and linting commands.

## Code Improvements
- [ ] Review error handling in `TodoistService` for non-JSON responses.
- [ ] Add more unit tests for tRPC routers and React components.
- [ ] Consider adding type definitions for task objects shared between server and client.
- [ ] Audit existing environment variable usage to remove unused variables like `TODOIST_TOKEN` if deprecated.