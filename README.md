# Make Markdown rendering faster

A dependency-free JavaScript Markdown renderer and Node.js driver for [Make Markdown rendering faster](https://make.fun/bounty/markdown-render-speed-02). The renderer emits HTML directly, handles CommonMark and GFM constructs with marked 18.1.3 default output semantics, and caches reusable inline fragments. The driver reads `cases.json` from the input directory and writes the ordered HTML strings to `html.json` in the output directory.
