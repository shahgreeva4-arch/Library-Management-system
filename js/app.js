'use strict';

const STORAGE_KEY = 'library-ms-data-v1';
const LOAN_DAYS = 14;
const FINE_PER_DAY = 5;
const VIEWS = ['dashboard', 'books', 'members', 'loans'];

/* ---------- Date helpers (dates are stored as YYYY-MM-DD strings) ---------- */

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  return toISO(new Date());
}

function addDays(iso, days) {
  const date = parseISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

function daysBetween(from, to) {
  return Math.round((parseISO(to) - parseISO(from)) / 86400000);
}

function formatDate(iso) {
  return parseISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------- Sample data ---------- */

function createSampleData() {
  const t = today();
  const data = { books: [], members: [], loans: [], seq: { book: 0, member: 0, loan: 0 } };

  const books = [
    ['To Kill a Mockingbird', 'Harper Lee', '9780061120084', 'Fiction', 1960, 3],
    ['1984', 'George Orwell', '9780451524935', 'Fiction', 1949, 4],
    ['Pride and Prejudice', 'Jane Austen', '9780141439518', 'Classics', 1813, 2],
    ['The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 'Classics', 1925, 2],
    ['Sapiens', 'Yuval Noah Harari', '9780062316097', 'History', 2011, 3],
    ['A Brief History of Time', 'Stephen Hawking', '9780553380163', 'Science', 1988, 2],
    ['The Selfish Gene', 'Richard Dawkins', '9780198788607', 'Science', 1976, 1],
    ['Clean Code', 'Robert C. Martin', '9780132350884', 'Technology', 2008, 2],
    ['The Pragmatic Programmer', 'David Thomas, Andrew Hunt', '9780135957059', 'Technology', 2019, 2],
    ['Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305', 'Technology', 2022, 1],
    ['The Guns of August', 'Barbara W. Tuchman', '9780345476098', 'History', 1962, 1],
    ['Wings of Fire', 'A. P. J. Abdul Kalam', '9788173711466', 'Biography', 1999, 3],
    ['Steve Jobs', 'Walter Isaacson', '9781451648539', 'Biography', 2011, 1],
    ['The Alchemist', 'Paulo Coelho', '9780062315007', 'Fiction', 1988, 3],
    ['Thinking, Fast and Slow', 'Daniel Kahneman', '9780374533557', 'Psychology', 2011, 2],
    ['Atomic Habits', 'James Clear', '9780735211292', 'Self-help', 2018, 3],
  ];
  for (const [title, author, isbn, genre, year, copies] of books) {
    data.books.push({ id: makeId(data, 'book'), title, author, isbn, genre, year, copies });
  }

  const members = [
    ['Aarav Mehta', '+91 98250 41762', -410],
    ['Priya Patel', '+91 99090 12845', -365],
    ['Rohan Desai', '+91 97240 55318', -300],
    ['Ananya Iyer', '+91 98793 20476', -220],
    ['Kabir Singh', '+91 90990 63154', -180],
    ['Meera Joshi', '+91 98984 70291', -95],
    ['Vikram Rao', '+91 93270 18843', -60],
    ['Sneha Kulkarni', '+91 96620 39507', -21],
  ];
  for (const [name, phone, joined] of members) {
    const email = name.toLowerCase().replace(' ', '.') + '@example.com';
    data.members.push({ id: makeId(data, 'member'), name, email, phone, joined: addDays(t, joined) });
  }

  // [book index, member index, issued (days from today), returned (days from today) or null]
  const loans = [
    [5, 2, -60, -50],
    [2, 7, -40, -27],
    [11, 4, -30, -18],
    [13, 0, -25, -12],
    [0, 0, -20, null],
    [7, 2, -16, null],
    [9, 6, -12, null],
    [6, 5, -10, null],
    [4, 1, -5, null],
    [1, 3, -3, null],
    [8, 1, -1, null],
  ];
  for (const [b, m, issued, returned] of loans) {
    const issuedOn = addDays(t, issued);
    data.loans.push({
      id: makeId(data, 'loan'),
      bookId: data.books[b].id,
      memberId: data.members[m].id,
      issued: issuedOn,
      due: addDays(issuedOn, LOAN_DAYS),
      returned: returned === null ? null : addDays(t, returned),
    });
  }

  return data;
}

function makeId(data, kind) {
  const prefix = { book: 'BK', member: 'MB', loan: 'LN' }[kind];
  data.seq[kind] += 1;
  return `${prefix}-${String(data.seq[kind]).padStart(4, '0')}`;
}

/* ---------- Storage ---------- */

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    // Storage unavailable (private mode etc.), fall back to sample data
  }
  return createSampleData();
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Changes will only last for this session
  }
}

let state = loadData();
let loanFilter = 'active';

/* ---------- Lookups ---------- */

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const findBook = (id) => state.books.find((b) => b.id === id);
const findMember = (id) => state.members.find((m) => m.id === id);
const activeLoans = () => state.loans.filter((l) => !l.returned);

function availableCopies(book) {
  return book.copies - state.loans.filter((l) => l.bookId === book.id && !l.returned).length;
}

function loanStatus(loan) {
  if (loan.returned) return 'returned';
  return loan.due < today() ? 'overdue' : 'active';
}

function daysLate(loan) {
  return Math.max(0, daysBetween(loan.due, loan.returned || today()));
}

function fineFor(loan) {
  return daysLate(loan) * FINE_PER_DAY;
}

function bookTitle(id) {
  const book = findBook(id);
  return book ? book.title : 'Removed book';
}

function memberName(id) {
  const member = findMember(id);
  return member ? member.name : 'Removed member';
}

function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

function emptyRow(colspan, text) {
  return `<tr class="empty"><td colspan="${colspan}">${text}</td></tr>`;
}

/* ---------- Dashboard ---------- */

function renderDashboard() {
  const t = today();
  const totalCopies = state.books.reduce((sum, b) => sum + b.copies, 0);
  const onLoan = activeLoans();
  const overdue = onLoan.filter((l) => loanStatus(l) === 'overdue');
  const dueSoon = onLoan.filter((l) => l.due >= t && daysBetween(t, l.due) <= 3);
  const outstanding = overdue.reduce((sum, l) => sum + fineFor(l), 0);

  $('#today-label').textContent = parseISO(t).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  $('#stat-titles').textContent = state.books.length;
  $('#stat-titles-note').textContent = `${plural(totalCopies, 'copy', 'copies')} in total`;
  $('#stat-available').textContent = totalCopies - onLoan.length;
  $('#stat-available-note').textContent = `${plural(state.members.length, 'registered member')}`;
  $('#stat-loans').textContent = onLoan.length;
  $('#stat-loans-note').textContent = `${dueSoon.length} due in the next 3 days`;
  $('#stat-overdue').textContent = overdue.length;
  $('#stat-overdue-note').textContent = `₹${outstanding} in fines outstanding`;

  const overdueRows = overdue
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((l) => `
      <tr>
        <td>${escapeHtml(bookTitle(l.bookId))}</td>
        <td>${escapeHtml(memberName(l.memberId))}</td>
        <td class="nowrap">${formatDate(l.due)}</td>
        <td class="num nowrap">${plural(daysLate(l), 'day')}</td>
      </tr>`)
    .join('');
  $('#overdue-body').innerHTML = overdueRows || emptyRow(4, 'No overdue loans.');

  const events = [];
  for (const l of state.loans) {
    events.push({ date: l.issued, loan: l, verb: 'borrowed' });
    if (l.returned) events.push({ date: l.returned, loan: l, verb: 'returned' });
  }
  events.sort((a, b) => b.date.localeCompare(a.date) || b.loan.id.localeCompare(a.loan.id));

  $('#activity-list').innerHTML = events.slice(0, 7).map((e) => `
    <li>
      <span>${escapeHtml(memberName(e.loan.memberId))} ${e.verb} <em>${escapeHtml(bookTitle(e.loan.bookId))}</em></span>
      <time datetime="${e.date}">${formatDate(e.date)}</time>
    </li>`).join('') || '<li class="empty">No activity yet.</li>';
}

/* ---------- Books ---------- */

function genres() {
  return [...new Set(state.books.map((b) => b.genre))].sort();
}

function renderBooks() {
  const query = $('#book-search').value.trim().toLowerCase();
  const genreSelect = $('#book-genre');
  const genre = genreSelect.value;
  const availability = $('#book-availability').value;

  genreSelect.innerHTML = '<option value="">All genres</option>' +
    genres().map((g) => `<option${g === genre ? ' selected' : ''}>${escapeHtml(g)}</option>`).join('');
  $('#genre-options').innerHTML = genres().map((g) => `<option value="${escapeHtml(g)}">`).join('');

  const rows = state.books
    .filter((b) => !query || `${b.title} ${b.author} ${b.isbn}`.toLowerCase().includes(query))
    .filter((b) => !genre || b.genre === genre)
    .filter((b) => {
      if (availability === 'available') return availableCopies(b) > 0;
      if (availability === 'unavailable') return availableCopies(b) === 0;
      return true;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  $('#books-count').textContent = `${plural(state.books.length, 'title')} in the catalogue`;
  $('#books-body').innerHTML = rows.map((b) => {
    const available = availableCopies(b);
    const badge = available > 0
      ? `<span class="badge badge-ok">${available} of ${b.copies} available</span>`
      : '<span class="badge badge-muted">All on loan</span>';
    return `
      <tr>
        <td>
          <span class="cell-main">${escapeHtml(b.title)}</span>
          <span class="cell-sub">${escapeHtml(b.author)}</span>
        </td>
        <td class="mono">${escapeHtml(b.isbn)}</td>
        <td>${escapeHtml(b.genre)}</td>
        <td class="num">${escapeHtml(b.year)}</td>
        <td>${badge}</td>
        <td class="actions">
          ${available > 0 ? `<button type="button" class="row-action" data-action="issue-book" data-id="${b.id}">Issue</button>` : ''}
          <button type="button" class="row-action" data-action="edit-book" data-id="${b.id}">Edit</button>
          <button type="button" class="row-action danger" data-action="delete-book" data-id="${b.id}">Delete</button>
        </td>
      </tr>`;
  }).join('') || emptyRow(6, 'No books match your search.');
}

function openBookDialog(book) {
  const form = $('#book-form');
  form.reset();
  form.dataset.id = book ? book.id : '';
  $('#book-dialog-title').textContent = book ? 'Edit book' : 'Add book';
  if (book) {
    for (const key of ['title', 'author', 'isbn', 'genre', 'year', 'copies']) {
      form.elements[key].value = book[key];
    }
  }
  setFormError(form, '');
  $('#book-dialog').showModal();
}

function saveBook(form) {
  const f = form.elements;
  const id = form.dataset.id;
  const book = {
    title: f.title.value.trim(),
    author: f.author.value.trim(),
    isbn: f.isbn.value.replace(/[\s-]/g, ''),
    genre: f.genre.value.trim(),
    year: Number(f.year.value),
    copies: Number(f.copies.value),
  };

  if (!book.title || !book.author || !book.genre) return 'Please fill in all fields.';
  if (!/^(\d{9}[\dX]|\d{13})$/i.test(book.isbn)) return 'ISBN should be 10 or 13 digits.';
  if (state.books.some((b) => b.isbn === book.isbn && b.id !== id)) return 'A book with this ISBN already exists.';
  if (!Number.isInteger(book.year) || book.year < 1000 || book.year > new Date().getFullYear()) return 'Enter a valid year.';
  if (!Number.isInteger(book.copies) || book.copies < 1) return 'Copies must be at least 1.';

  if (id) {
    const existing = findBook(id);
    const onLoan = existing.copies - availableCopies(existing);
    if (book.copies < onLoan) return `${plural(onLoan, 'copy', 'copies')} of this book ${onLoan === 1 ? 'is' : 'are'} on loan.`;
    Object.assign(existing, book);
    toast('Book updated');
  } else {
    state.books.push({ id: makeId(state, 'book'), ...book });
    toast('Book added');
  }
  return null;
}

/* ---------- Members ---------- */

function renderMembers() {
  const query = $('#member-search').value.trim().toLowerCase();
  const rows = state.members
    .filter((m) => !query || `${m.name} ${m.email} ${m.id}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  $('#members-count').textContent = `${plural(state.members.length, 'registered member')}`;
  $('#members-body').innerHTML = rows.map((m) => {
    const out = activeLoans().filter((l) => l.memberId === m.id);
    const late = out.some((l) => loanStatus(l) === 'overdue');
    return `
      <tr>
        <td>
          <span class="cell-main">${escapeHtml(m.name)}</span>
          <span class="cell-sub">${m.id}</span>
        </td>
        <td>
          <span class="cell-main">${escapeHtml(m.email)}</span>
          <span class="cell-sub">${escapeHtml(m.phone)}</span>
        </td>
        <td class="nowrap">${formatDate(m.joined)}</td>
        <td class="num">${out.length}${late ? ' <span class="badge badge-danger">Overdue</span>' : ''}</td>
        <td class="actions">
          <button type="button" class="row-action" data-action="edit-member" data-id="${m.id}">Edit</button>
          <button type="button" class="row-action danger" data-action="delete-member" data-id="${m.id}">Delete</button>
        </td>
      </tr>`;
  }).join('') || emptyRow(5, 'No members match your search.');
}

function openMemberDialog(member) {
  const form = $('#member-form');
  form.reset();
  form.dataset.id = member ? member.id : '';
  $('#member-dialog-title').textContent = member ? 'Edit member' : 'Add member';
  if (member) {
    for (const key of ['name', 'email', 'phone']) form.elements[key].value = member[key];
  }
  setFormError(form, '');
  $('#member-dialog').showModal();
}

function saveMember(form) {
  const f = form.elements;
  const id = form.dataset.id;
  const member = {
    name: f.name.value.trim(),
    email: f.email.value.trim().toLowerCase(),
    phone: f.phone.value.trim(),
  };

  if (!member.name || !member.email || !member.phone) return 'Please fill in all fields.';
  if (!f.email.checkValidity()) return 'Enter a valid email address.';
  if (!/^[+\d][\d\s-]{6,}$/.test(member.phone)) return 'Enter a valid phone number.';
  if (state.members.some((m) => m.email === member.email && m.id !== id)) return 'A member with this email already exists.';

  if (id) {
    Object.assign(findMember(id), member);
    toast('Member updated');
  } else {
    state.members.push({ id: makeId(state, 'member'), ...member, joined: today() });
    toast('Member added');
  }
  return null;
}

/* ---------- Loans ---------- */

function renderLoans() {
  const query = $('#loan-search').value.trim().toLowerCase();

  document.querySelectorAll('#loan-filters button').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === loanFilter));
  });

  const rows = state.loans
    .filter((l) => {
      const status = loanStatus(l);
      if (loanFilter === 'active') return status !== 'returned';
      if (loanFilter === 'all') return true;
      return status === loanFilter;
    })
    .filter((l) => !query || `${bookTitle(l.bookId)} ${memberName(l.memberId)} ${l.id}`.toLowerCase().includes(query))
    .sort((a, b) => b.issued.localeCompare(a.issued) || b.id.localeCompare(a.id));

  $('#loans-body').innerHTML = rows.map((l) => {
    const status = loanStatus(l);
    const fine = fineFor(l);
    let badge;
    if (status === 'returned') {
      badge = `<span class="badge badge-muted">Returned ${formatDate(l.returned)}</span>`;
    } else if (status === 'overdue') {
      badge = `<span class="badge badge-danger">${plural(daysLate(l), 'day')} late</span>`;
    } else {
      const left = daysBetween(today(), l.due);
      badge = left <= 3
        ? `<span class="badge badge-warn">${left === 0 ? 'Due today' : `Due in ${plural(left, 'day')}`}</span>`
        : '<span class="badge badge-ok">On loan</span>';
    }
    return `
      <tr>
        <td class="mono">${l.id}</td>
        <td>${escapeHtml(bookTitle(l.bookId))}</td>
        <td>${escapeHtml(memberName(l.memberId))}</td>
        <td class="nowrap">${formatDate(l.issued)}</td>
        <td class="nowrap">${formatDate(l.due)}</td>
        <td>${badge}</td>
        <td class="num">${fine ? `₹${fine}` : '–'}</td>
        <td class="actions">
          ${status === 'returned' ? '' : `<button type="button" class="row-action" data-action="return-loan" data-id="${l.id}">Mark returned</button>`}
        </td>
      </tr>`;
  }).join('') || emptyRow(8, 'No loans to show.');
}

function openLoanDialog(bookId) {
  const form = $('#loan-form');
  const available = state.books
    .filter((b) => availableCopies(b) > 0)
    .sort((a, b) => a.title.localeCompare(b.title));
  const members = [...state.members].sort((a, b) => a.name.localeCompare(b.name));

  if (!members.length) return toast('Add a member first');
  if (!available.length) return toast('No copies are available to issue');

  form.reset();
  form.elements.memberId.innerHTML = '<option value="">Select a member</option>' +
    members.map((m) => `<option value="${m.id}">${escapeHtml(m.name)} (${m.id})</option>`).join('');
  form.elements.bookId.innerHTML = '<option value="">Select a book</option>' +
    available.map((b) => `<option value="${b.id}">${escapeHtml(b.title)}, ${escapeHtml(b.author)}</option>`).join('');
  if (bookId) form.elements.bookId.value = bookId;
  form.elements.issued.value = today();
  form.elements.due.value = addDays(today(), LOAN_DAYS);
  setFormError(form, '');
  $('#loan-dialog').showModal();
}

function saveLoan(form) {
  const f = form.elements;
  const loan = {
    bookId: f.bookId.value,
    memberId: f.memberId.value,
    issued: f.issued.value,
    due: f.due.value,
  };

  if (!loan.memberId) return 'Select a member.';
  if (!loan.bookId) return 'Select a book.';
  if (!loan.issued || !loan.due) return 'Enter both dates.';
  if (loan.due < loan.issued) return 'Due date cannot be before the issue date.';
  if (availableCopies(findBook(loan.bookId)) < 1) return 'No copies of this book are available.';

  state.loans.push({ id: makeId(state, 'loan'), ...loan, returned: null });
  toast(`Issued to ${memberName(loan.memberId)}`);
  return null;
}

function returnLoan(id) {
  const loan = state.loans.find((l) => l.id === id);
  if (!loan || loan.returned) return;
  loan.returned = today();
  const fine = fineFor(loan);
  commit();
  toast(fine ? `Returned. Fine due: ₹${fine}` : 'Returned on time');
}

/* ---------- Shared UI ---------- */

function setFormError(form, message) {
  form.querySelector('.form-error').textContent = message;
}

let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

let pendingConfirm = null;
function confirmAction(title, message, label, onConfirm) {
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  $('#confirm-ok').textContent = label;
  pendingConfirm = onConfirm;
  $('#confirm-dialog').returnValue = '';
  $('#confirm-dialog').showModal();
}

function renderAll() {
  renderDashboard();
  renderBooks();
  renderMembers();
  renderLoans();
}

function commit() {
  saveData();
  renderAll();
}

function showView() {
  const requested = location.hash.slice(1);
  const view = VIEWS.includes(requested) ? requested : 'dashboard';
  for (const name of VIEWS) {
    document.getElementById(`view-${name}`).hidden = name !== view;
  }
  document.querySelectorAll('.nav a').forEach((link) => {
    if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

/* ---------- Events ---------- */

document.addEventListener('click', (event) => {
  const filterLink = event.target.closest('[data-loan-filter]');
  if (filterLink) {
    loanFilter = filterLink.dataset.loanFilter;
    renderLoans();
  }

  const closeButton = event.target.closest('[data-close]');
  if (closeButton) {
    closeButton.closest('dialog').close();
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { id } = button.dataset;

  switch (button.dataset.action) {
    case 'add-book':
      openBookDialog();
      break;
    case 'edit-book':
      openBookDialog(findBook(id));
      break;
    case 'delete-book': {
      const book = findBook(id);
      if (availableCopies(book) < book.copies) {
        toast('This book has copies on loan and cannot be deleted');
        break;
      }
      confirmAction('Delete book', `"${book.title}" will be removed from the catalogue.`, 'Delete', () => {
        state.books = state.books.filter((b) => b.id !== id);
        commit();
        toast('Book deleted');
      });
      break;
    }
    case 'issue-book':
      openLoanDialog(id);
      break;
    case 'add-member':
      openMemberDialog();
      break;
    case 'edit-member':
      openMemberDialog(findMember(id));
      break;
    case 'delete-member': {
      const member = findMember(id);
      if (activeLoans().some((l) => l.memberId === id)) {
        toast('This member still has books on loan');
        break;
      }
      confirmAction('Delete member', `${member.name} (${member.id}) will be removed.`, 'Delete', () => {
        state.members = state.members.filter((m) => m.id !== id);
        commit();
        toast('Member deleted');
      });
      break;
    }
    case 'issue-loan':
      openLoanDialog();
      break;
    case 'return-loan':
      returnLoan(id);
      break;
    case 'reset-data':
      confirmAction('Reset sample data', 'All books, members and loans will be replaced with the sample data.', 'Reset', () => {
        state = createSampleData();
        loanFilter = 'active';
        commit();
        toast('Sample data restored');
      });
      break;
  }
});

const forms = [
  ['#book-form', saveBook],
  ['#member-form', saveMember],
  ['#loan-form', saveLoan],
];
for (const [selector, save] of forms) {
  $(selector).addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const error = save(form);
    if (error) {
      setFormError(form, error);
      return;
    }
    form.closest('dialog').close();
    commit();
  });
}

$('#confirm-dialog').addEventListener('close', () => {
  if ($('#confirm-dialog').returnValue === 'confirm' && pendingConfirm) pendingConfirm();
  pendingConfirm = null;
});

document.querySelectorAll('#loan-filters button').forEach((btn) => {
  btn.addEventListener('click', () => {
    loanFilter = btn.dataset.filter;
    renderLoans();
  });
});

$('#book-search').addEventListener('input', renderBooks);
$('#book-genre').addEventListener('change', renderBooks);
$('#book-availability').addEventListener('change', renderBooks);
$('#member-search').addEventListener('input', renderMembers);
$('#loan-search').addEventListener('input', renderLoans);
window.addEventListener('hashchange', showView);

renderAll();
showView();
