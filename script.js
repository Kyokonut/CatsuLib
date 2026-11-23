var books = JSON.parse(localStorage.getItem("books")) || [
    {
        id: "B001",
        title: "Mathematics 1",
        author: "Jason Momoa",
        status: "Available",
        student: "",
        due: "",
    },
    {
        id: "B002",
        title: "Chemistry 1",
        author: "Maria",
        status: "Borrowed",
        student: "Lira",
        due: "2026-11-18",
    },
];

var queue = JSON.parse(localStorage.getItem("queue")) || [
    {
        name: "Lira A",
        book: "Chemistry 1",
        priority: "Faculty",
    },
    {
        name: "Lira B",
        book: "Mathematics 1",
        priority: "Regular"
    },
];

var content = document.getElementById("pageContent");
var currentPage = "dashboard";
var penaltyPerDay = 5;
var returnedCount = Number(localStorage.getItem("returnedCount")) || 0;

function save(){
    localStorage.setItem("books", JSON.stringify(books));
    localStorage.setItem("queue", JSON.stringify(queue));
    localStorage.setItem("returnedCount", returnedCount);
}

function today(){
    return new Date().toISOString().slice(0, 10);
}

function updateOverdueBook(){
    books.forEach(function(book){
        if(book.status === "Borrowed" && book.due < today()){
            book.status = "Overdue";
        }
    });
    save();
}

function lateDays(book){
    if(!book.due || book.status !== "Overdue") return 0;
    return Math.floor((new Date(today()) - new Date(book.due)) / 86400000);
}

function fine(book){
    return lateDays(book) * penaltyPerDay;
}

function dueTime(book){
    if(!book.due) return Number.POSITIVE_INFINITY;
    var time = new Date(book.due).getTime();
    return isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function moveDueHeap(heap, index, size){
    var largest = index;
    var left = 2 * index + 1;
    var right = 2 * index + 2;

    if(left < size && dueTime(heap[left]) > dueTime(heap[largest])){
        largest = left;
    }
    if(right < size && dueTime(heap[right]) > dueTime(heap[largest])){
        largest = right;
    }

    if(largest !== index){
        var temp = heap[index];
        heap[index] = heap[largest];
        heap[largest] = temp;
        moveDueHeap(heap, largest, size);
    }
}

function sortByDueDate(list){
    var heap = list.slice();

    for(var i = Math.floor(heap.length / 2) - 1; i >= 0; i--){
        moveDueHeap(heap, i, heap.length);
    }

    for(var end = heap.length - 1; end > 0; end--){
        var temp = heap[0];
        heap[0] = heap[end];
        heap[end] = temp;
        moveDueHeap(heap, 0, end);
    }

    return heap;
}

function total(status){
    return books.filter(function (book){
        return book.status === status;
    }).length;
}

function donutStyle(overdue) {
  var borrowed = total("Borrowed");
  var returned = returnedCount;
  var totalItems = borrowed + returned + overdue.length;

  if (!totalItems) {
    return "--donut-background: #dfe1ea";
  }

  var borrowedEnd = (borrowed / totalItems) * 100;
  var returnedEnd = borrowedEnd + (returned / totalItems) * 100;

  return (
    "--donut-background: conic-gradient(" +
    "#171a42 0 " +
    borrowedEnd +
    "%, " +
    "#e3bd2b " +
    borrowedEnd +
    "% " +
    returnedEnd +
    "%, " +
    "#d75c4d " +
    returnedEnd +
    "% 100%)"
  );
}

function message(text){
    var box = document.getElementById("message");
    box.textContent = text;
    box.classList.add("show");
    setTimeout(function (){
        box.classList.remove("show");
    }, 2500);
}

function openPage(page){
    currentPage = page;
    document.getElementById("pageName").textContent = page;
    document.querySelectorAll("[data-page]").forEach(function (button){
        button.classList.toggle("active", button.dataset.page === page);
    });

    updateOverdueBook();

    if(page === "dashboard") dashboard();
    if(page === "books") bookList();
    if(page === "borrow") borrowForm();
    if(page === "returns") returnsPage();
    if(page === "queue") queuePage();
    if(page === "reports") reportsPage();

}

function dashboard(){
    var overdue = sortByDueDate(books.filter(function (book) {
        return book.status === "Overdue";
    }));

    content.innerHTML = `
    <div class="heading">
        <div>
            <h1>Admin Dashboard</h1>
            <p>Daily transcation and library overwiew</p>
        </div>
        <span class="muted">${new Date().toLocaleDateString()}</span>
    </div>

    <div class="cards">
        <div class="card"><p>Books Available</p><strong>${total("Available")}</strong><small>In the library</small></div>
        <div class="card"><p>Borrowed Books</p><strong>${total("Borrowed")}</strong><small>Currently borrowed</small></div>
        <div class="card"><p>Returned Books</p><strong>${returnedCount}</strong><small>This month</small></div>
        <div class="card"><p>Overdued Books</p><strong>${overdue.length}</strong><small>₱${overdue.reduce(
            function (sum, book){
                return sum + fine(book);
            },0,
        )} penalty</small></div>
    </div>
    
    <div class="dashboard-grid">
        <div class="panel">
            <h2>Recent Activity</h2>
            <p class="activity">Lira borrowed Chemistry 1</p>
            <p class="activity">Pritam has an overdue book</p>
            <p class="activity">Nick returned a book</p>
        </div>
        <div class="panel">
            <h2>Monthly Report</h2>
            <div class="donut"
                style="${donutStyle(overdue)}"role="img"
                aria-label="Monthly report: ${total("Borrowed")} borrowed, ${returnedCount} returned, ${overdue.length} overdue">
            </div>
            <div class="legend">
                <p>Borrowed <b>${total("Borrowed")}</b></p>
                <p>Returned <b>${returnedCount}</b></p>
            </div>
        </div>
    </div>

    <div class="panel bottom-panel">
        <h2>Overdue Books</h2>
        ${overdue.length ? overdueRows(overdue) : "<p class='muted'>No overdue books.</p>"}
    </div>
    `;
    returnButtons();
}

function overdueRows(overdue) {
    return `
        <div class="table-box">
            <table>
                <tr><th>Book</th><th>Student</th><th>Due Date</th><th>Late</th><th>Fine</th><th></th></tr>
                ${overdue.map(function (book){
                    return `<tr>
                    <td>${book.title}</td>
                    <td>${book.student}</td>
                    <td>${book.due}</td>
                    <td>${lateDays(book)} days</td>
                    <td>${fine(book)}</td>
                    <td><button class="small-button return" data-id="${book.id}">Return</button></td>
                </tr>`;
                }).join("")}
            </table>
        </div>
    `;
}

function bookList(){
    var search = document.getElementById("searchBox").value.toLowerCase();
    var result = sortByDueDate(books.filter(function(book){
        return (
            book.title.toLowerCase().includes(search) ||
            book.author.toLowerCase().includes(search)
        );
    }));

    content.innerHTML= `
    <div class="heading">
        <div><h1>Books</h1><p>All registered library books</p></div>
        <button class="button" id="addBook">+ Add Book</button>
    </div>
    <div class="panel table-box">
        <table>
            <tr><th>ID</th><th>Title</th><th>Author</th><th>Status</th><th>Student / Due</th><th>Action</th></tr>
            ${result.map(function (book) {
                return `<tr>
                <td>${book.id}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td><span class="status ${book.status.toLowerCase()}">${book.status}</span></td>
                <td>${book.student || "-"}${book.due ? `<br><small>${book.due}${book.status === "Overdue" ? " · ₱" + fine(book) : ""}</small>` : ""}</td>
                <td>${book.status === "Available" ? "-" : `<button class="small-button return" data-id="${book.id}">Return</button>`}</td>
                </tr>`;
            }).join("")}
        </table>
    </div>
    `;

    document.getElementById("addBook").onclick = addBook;
    returnButtons();
}

function addBook(){
    var title = prompt("Book title: ");
    var author = prompt("Author:");
    if(!title || !author) return;

    books.push({
        id: "B00" + (books.length + 1),
        title: title,
        author: author,
        status: "Available",
        student: "",
        due: "",
    });
    save();
    message("book added.");
    bookList();
}

function borrowForm(){
    var available = books.filter(function (book){
        return book.status === "Available";
    });

    content.innerHTML = `
        <div class="heading"><div><h1>Borrow Book</h1><p>Books are due after seven days.</p></div></div>
        <div class="panel form-panel">
            <form id="borrowForm">
                <label>Book</label>
                <select id="borrowBook">${available
                    .map(function (book){
                        return `<option value="${book.id}">${book.title}</option>`;
                    }).join("")}
                </select>
                <label>Student name</label>
                <input id="studentName" required>
                <button class="button" type="submit">Borrow Book</button>
            </form>
        </div>
    `;
    document.getElementById("borrowForm").onsubmit = borrow;
}

function borrow(event){
    event.preventDefault();
    var book = books.find(function (item){
        return item.id === document.getElementById("borrowBook").value;
    });
    if (!book) return message("No book available.");

    var due = new Date();
    due.setDate(due.getDate() + 7);
    book.status = "Borrowed";
    book.student = document.getElementById("studentName").value;
    book.due = due.toISOString().slice(0, 10);
    save();
    message("Book borrowed.");
    openPage("dashboard");
}

function returnsPage(){
    var borrowed = sortByDueDate(books.filter(function (book) {
        return book.status !== "Available";
    }));

    content.innerHTML = `
        <div class="heading"><div><h1>Returns</h1><p>Return borrowed books here.</p></div></div>
        <div class="panel">
            ${borrowed.map(function (book){
                return `<p class="activity">
                ${book.title} - ${book.student}
                <span class="status ${book.status.toLowerCase()}">${book.status === "Overdue" ? " · ₱" + fine(book) : ""}</span>
                <button class="small-button return" data-id="${book.id}">Return</button>
                </p>`;
            }).join("") || "<p class='muted'>No borrowed books.</p>"
            }
        </div>
    `;
    returnButtons();
}

function returnButtons(){
    document.querySelectorAll(".return").forEach(function (button){
        button.onclick = function (){
            var book = books.find(function (item) {
                return item.id === button.dataset.id;
            });
            var amount = fine(book);
            book.status = "Available";
            book.student = "";
            book.due = "";
            returnedCount++;
            save();
            message(amount ? "Returned. Fine: ₱" + amount : "Book returned.");
            openPage(currentPage);
        };
    });
}

function queuePage(){
    content.innerHTML = `
        <div class="heading">
            <div><h1>Waiting List</h1><p>Students waiting for a book.</p></div>
            <button class="button" id="addStudent">+ Add Student</button>
        </div>
        <div class="panel">
            ${queue.map(function (student, index){
                return `<p class="activity">
                    ${index + 1}. <b>${student.name}</b> wants ${student.book} (${student.priority})
                    <button class="small-button remove-queue" data-index="${index}">Remove</button>
                </p>`;
            }).join("") || "<p class='muted'>No students on the waiting list.</p>"}
        </div>
    `;
    document.getElementById("addStudent").onclick = addStudent;
    removeQueueButtons();
}

function removeQueueButtons(){
    document.querySelectorAll(".remove-queue").forEach(function (button){
        button.onclick = function (){
            var index = Number(button.dataset.index);
            var student = queue[index];
            queue.splice(index, 1);
            save();
            message(student.name + " removed from the waiting list.");
            queuePage();
        };
    });
}

function addStudent(){
    var name = prompt("Student name:");
    var book = prompt("Book title:");
    if(!name || !book) return;
    queue.push({
        name: name,
        book: book,
        priority: "Regular"
    });
    save();
    queuePage();
}

function reportsPage(){
    content.innerHTML = `
        <div class="heading"><div><h1>Reports</h1><p>Library statistics.</p></div></div>
        <div class="cards">
            <div class="card"><p>Total Books</p><strong>${books.length}</strong></div>
            <div class="card"><p>Available</p><strong>${total("Available")}</strong></div>
            <div class="card"><p>Borrowed</p><strong>${total("Borrowed")}</strong></div>
            <div class="card"><p>Overdue</p><strong>${total("Overdue")}</strong></div> 
        </div> 
    `;
}

document.getElementById("loginForm").onsubmit = function (event){
    event.preventDefault();
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    if(email === "lira@libreturn.com" && password === "lira123"){
        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("appPage").classList.remove("hidden");
        openPage("dashboard");
    }else {
        document.getElementById("loginMessage").textContent = "Wrong login details.";
    }
};

document.querySelectorAll("[data-page]").forEach(function (button) {
    button.onclick = function(){
        openPage(button.dataset.page)
    }
});

document.getElementById("searchBox").oninput = function(){
    if(currentPage === "books") bookList();
};

document.getElementById("logoutButton").onclick = function(){
    document.getElementById("appPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}