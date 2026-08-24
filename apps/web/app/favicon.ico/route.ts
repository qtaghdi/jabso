export const GET = (request: Request) =>
  Response.redirect(new URL('/icon.svg', request.url), 308)
