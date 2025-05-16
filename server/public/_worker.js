// This is a simple worker script for Cloudflare Pages
export default {
  async fetch(request, env, ctx) {
    // Pass the request to the static assets handler
    return await fetch(request);
  }
};