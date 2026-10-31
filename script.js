// Search records in the management tables

function searchTable() {

    let input = document.getElementById("searchInput");

    if (!input) {
        return;
    }

    let filter = input.value.toLowerCase();

    let table = document.getElementById("recordTable");

    let rows = table.getElementsByTagName("tr");

    for (let i = 1; i < rows.length; i++) {

        let rowText = rows[i].innerText.toLowerCase();

        if (rowText.includes(filter)) {

            rows[i].style.display = "";

        } else {

            rows[i].style.display = "none";

        }

    }

}


// Confirm before deleting records

function confirmDelete() {

    return confirm("Are you sure you want to delete this record?");

}