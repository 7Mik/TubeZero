# Contributing to TubeZero 🚀

First off, thank you for considering contributing to TubeZero! It is thanks to contributors like you that we can keep this project fast, lightweight, and clean.

## 🧠 Philosophy

Our goal is to build an ultra-lightweight, zero-dependency InnerTube client optimized for client-side environments (such as browser extensions, desktop apps, or lightweight web frontends). 

Any PR should align with these core tenets:
- **Zero External Dependencies**: We do not pull in heavy third-party NPM packages. We rely on native APIs (like fetch and Web Crypto).
- **Client-Side Optimized**: The code must be clean, fast, tree-shakeable, and compile easily to both ESM and CommonJS.
- **Privacy-First**: No telemetry, no external backend proxies, and no data tracking.

## 🛠️ Development Setup

1. **Fork** the repo on GitHub. Ensure your fork is based on the `developer` branch, which is where active development takes place.
2. **Clone** the project to your own machine.
3. **Install** development dependencies:
   ```bash
   npm install
   ```
4. **Development Watch Mode** (optional, compiles TypeScript in real-time):
   ```bash
   npm run dev
   ```
5. **Build** the package:
   ```bash
   npm run build
   ```

## 📝 Pull Request Process

1. Ensure any new code is clean, well-commented, and fully typed in TypeScript.
2. Maintain existing docstrings and comments.
3. **Local Testing**: Always run the tests before submitting a PR.
   - Run a production build: `npm run build`
   - Run the test suite: `npm test`
4. Update the `README.md` if you have added new features or changed existing APIs.
5. Submit your PR targeting the `developer` branch (make sure to fill out the PR template).
6. **Wait for LLM/bot review**: Your PR will be automatically reviewed by a helper bot. We expect you to address any issues it raises or explain why they are not applicable before a human developer performs final review.

## 🐛 Bug Reports & Feature Requests

Please use the GitHub Issue tracker. When reporting a bug, please include:
- The environment where the bug occurs (e.g., Browser Extension, Node.js, Electron).
- A minimal reproducing example.
- Error logs or stack traces if available.
