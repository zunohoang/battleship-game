# Architecture Overview

## 1. Project Overview

This project is a frontend application built with **ReactTS**.
The goal of the architecture is to ensure:

* Scalability
* Maintainability
* Clear separation of concerns
* Reusable components

---

# 2. Technology Stack

| Technology                    | Purpose              |
| ----------------------------- | -------------------- |
| React                         | UI library           |
| Vite / Create React App       | Project build tool   |
| React Router                  | Routing              |
| Axios / Fetch                 | API calls            |
| Zustand / Context API         | State management     |
| TailwindCSS / CSS Modules     | Styling              |
| ESLint / Prettier             | Code quality         |
| i18next                       | Internationalization |
| Socket.io                     | Real-time updates    |
| TypeScript                    | Type safety          |
| Lottie                        | Animations           |
| Lucide                        | Icons                |
| Framer Motion                 | Animations           |
| Jest / React Testing Library  | Testing              |

---

# 3. Project Folder Structure

```
src/
│
├── assets/          # images, fonts, static files
├── components/      # reusable UI components
├── pages/           # page-level components
├── layouts/         # layout components (Navbar, Sidebar)
├── routes/          # route definitions
├── services/        # API calls
├── store/           # state management
├── hooks/           # custom hooks
├── utils/           # helper functions
├── constants/       # constants and config
│
├── App.tsx          # current app shell baseline
├── App.css          # design-token/CSS variable strategy
└── main.tsx         # provider/router composition point
```

---

# 4. Application Architecture

The application follows a **Component-Based Architecture**.

```
Page
 ├── Layout
 │    ├── Navbar
 │    └── Sidebar
 │
 └── Components
      ├── UI Components
      └── Business Components
```

### Component Types

**1. UI Components**

* Button
* Modal
* Card
* Input

Reusable and stateless.

**2. Feature Components**
Contain business logic.

Example:

```
components/
   UserList/
      UserList.jsx
      UserItem.jsx
```

---

# 5. Routing

Routing is handled using **React Router**.

Example:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

# 6. State Management

State is managed using:

* **Local State** → `useState`
* **Shared State** → `Context API` / `Redux`

Example:

```
store/
   userStore.js
   authStore.js
```

---

# 7. API Layer

API requests are separated into **services**.

Example:

```
services/
   authService.js
   userService.js
```

Example code:

```javascript
import axios from "axios";

const API = axios.create({
  baseURL: "https://api.example.com"
});

export const getUsers = () => API.get("/users");
```

---

# 8. Custom Hooks

Reusable logic is placed inside `hooks/`.

Example:

```
hooks/
   useAuth.js
   useFetch.js
```

Example:

```javascript
import { useState, useEffect } from "react";

export function useFetch(url) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData);
  }, [url]);

  return data;
}
```

---

# 9. Styling Strategy

Possible styling approaches:

* TailwindCSS
* CSS Modules
* Styled Components

Example:

```
components/
   Button/
      Button.jsx
      Button.module.css
```

---

# 10. Best Practices

* Keep components **small and reusable**
* Avoid deep prop drilling
* Separate **logic and UI**
* Use **custom hooks for shared logic**
* Organize code by **feature**