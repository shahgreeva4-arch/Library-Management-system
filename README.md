# Library Management System

A simple, static library management system built with plain HTML, CSS and JavaScript. It runs entirely in the browser with no server, database or build step.

## Features

- **Dashboard** – totals for titles, available copies, books on loan and overdue loans, a list of overdue loans and recent borrowing activity.
- **Books** – add, edit and delete books; search by title, author or ISBN; filter by genre and availability; see how many copies are available.
- **Members** – register, edit and remove members; see how many books each member has out and whether any are overdue.
- **Loans** – issue books to members, mark them as returned and filter loans by status (on loan, overdue, returned).
- **Fines** – loans run for 14 days, and late returns are charged ₹5 per day.
- **Validation** – checks for ISBN format, duplicate ISBNs and emails, and dates. Books and members with active loans can't be deleted.
- **Saved locally** – all data is stored in the browser's `localStorage`, so it stays after a refresh. Use **Reset sample data** in the sidebar to start over.
- Responsive layout for mobile, and follows the system's light or dark mode.

## Getting started

1. Clone the repository:
   ```bash
   git clone https://github.com/shahgreeva4-arch/Library-Management-system.git
   ```
2. Open `index.html` in any modern browser.

No installation is needed. The app loads with sample books, members and loans so every page has data to explore.

## Project structure

```
Library-Management-system/
├── index.html        Page layout, views and dialogs
├── css/
│   └── styles.css    Styling, light/dark theme and responsive layout
└── js/
    └── app.js        Data, rendering and event handling
```

## How it works

- Data is kept in a single object with `books`, `members` and `loans`, and is saved to `localStorage` after every change.
- The available copies of a book are calculated from its total copies minus its active loans.
- A loan is **overdue** when today's date is past its due date and it has not been returned.
- Navigation uses the URL hash (`#books`, `#loans`, ...), so the browser's back button works between pages.

## Author

Greeva Shah
