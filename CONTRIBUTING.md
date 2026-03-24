# Contributing to AkronStats 📊

First off, thank you for considering contributing to AkronStats! 🚀

## 🧪 Development Workflow

### 1. Fork and Clone
Fork the repository and clone it locally:
```bash
git clone https://github.com/gomikestrat/akronstats.git
cd akronstats
```

### 2. Install Dependencies
We use a root `package.json` to manage dependencies for both the Backend Worker and the Frontend Dashboard:
```bash
npm run install:all
```

### 3. Local Setup
Copy the example environment files and fill in your Cloudflare credentials:
- `worker/.dev.vars.example` → `worker/.dev.vars`
- `dashboard/.env.example` → `dashboard/.env`

### 4. Run Locally
```bash
npm run dev
```

## 📜 Coding Standards

- **TypeScript**: We use TypeScript for both the Worker and the Dashboard. Use explicit types where possible.
- **Linting**: Before submitting a PR, ensure your code passes linting:
  ```bash
  npm run lint
  ```
- **Formatting**: We follow standard Prettier/ESLint rules.

## 📥 Submitting Changes

1. Create a new branch: `git checkout -b feature/your-awesome-feature`.
2. Commit your changes with clear, descriptive messages.
3. Push to your fork: `git push origin feature/your-awesome-feature`.
4. Open a Pull Request.

## 🐞 Bug Reports & Feature Requests

Please use the [GitHub Issues](https://github.com/gomikestrat/akronstats/issues) to report bugs or suggest enhancements. Use the provided templates if possible.

## ⚖️ Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

---
*Happy coding!* 🏺
