# AkronStats Dashboard 📈

This is the React-based frontend for AkronStats. It's built with Vite, TypeScript, and Tailwind CSS.

## 🚀 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Create a `.env` file (see `.env.example`):
    ```bash
    # Only needed if the API is on a different port/host
    VITE_API_URL=http://localhost:8787
    ```

3.  **Run locally**:
    ```bash
    npm run dev
    ```

4.  **Build for production**:
    ```bash
    npm run build
    ```

## 🏗️ Deployment

Deploy to Cloudflare Pages:
```bash
npx wrangler pages deploy dist --project-name akronstats
```

For full project info, see the root [README](../README.md).
