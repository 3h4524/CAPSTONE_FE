# CAPSTONE_FE

Frontend application for the CAPSTONE project.

## 📌 Overview

`CAPSTONE_FE` is the frontend application of the CAPSTONE system. It provides the user interface for interacting with the system's features and communicates with the backend through REST APIs.

> **Repository:** `3H4524/CAPSTONE_FE`

## ✨ Features

- User-friendly web interface
- Integration with CAPSTONE backend APIs
- Authentication and authorization
- Data management and presentation
- Form validation and error handling
- Responsive UI
- API communication
- Loading and notification states

> Update this section with the project's finalized feature list.

## 🛠️ Tech Stack

- Frontend framework: **[Add framework, e.g. React / Vue]**
- Language: **[Add language, e.g. TypeScript / JavaScript]**
- Styling: **[Add CSS framework/library]**
- HTTP client: **[Add Axios / Fetch / other]**
- Build tool: **[Add Vite / Webpack / other]**
- Package manager: **[npm / yarn / pnpm]**

## 📁 Project Structure

```text
CAPSTONE_FE/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   └── ...
├── .env.example
├── package.json
└── README.md
```

> Adjust the structure above to match the actual repository.

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/3H4524/CAPSTONE_FE.git
cd CAPSTONE_FE
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file based on `.env.example`.

Example:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

> Replace the variable names and values with the project's actual configuration.

### 4. Start the development server

```bash
npm run dev
```

The application should then be available at the URL shown in the terminal.

## 🔗 Backend

The frontend communicates with the CAPSTONE backend:

**Backend repository:** `3H4524/CAPSTONE_BE`

Example local API configuration:

```text
Frontend → http://localhost:<frontend-port>
              │
              ▼
        CAPSTONE_BE API
              │
              ▼
           Database
```

Make sure the backend is running and the frontend API base URL is configured correctly.

## 🔐 Environment Variables

Do not commit secrets or private credentials to GitHub.

Use `.env.example` to document required environment variables without exposing sensitive values.

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8080/api` |

## 🧪 Testing

Run the project's test command:

```bash
npm test
```

> Update this command if the repository uses a different testing setup.

## 📦 Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## 🌿 Git Workflow

Recommended branch naming:

```text
main
develop
feature/<feature-name>
fix/<issue-name>
hotfix/<issue-name>
```

Example:

```bash
git checkout -b feature/login
git add .
git commit -m "feat: implement login page"
git push origin feature/login
```

Create a Pull Request to the team's target integration branch.

## 📝 Commit Convention

Recommended format:

```text
<type>: <description>
```

Examples:

```text
feat: add login page
fix: resolve token expiration issue
refactor: improve API service
docs: update README
test: add authentication tests
chore: update dependencies
```

## 🤝 Contribution

1. Create a feature/fix branch.
2. Implement your changes.
3. Test your changes locally.
4. Commit using the agreed convention.
5. Push the branch to GitHub.
6. Create a Pull Request.
7. Request a code review.
8. Merge only after the required approvals/checks pass.

## 👥 Team

| Role | Member |
|---|---|
| Frontend Developer | [Name] |
| Frontend Developer | [Name] |
| Backend Developer | [Name] |
| Backend Developer | [Name] |
| Project Manager / BA | [Name] |

## 📄 License

This project is developed for academic/capstone purposes.

Add the project's official license here if applicable.
