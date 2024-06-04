document.addEventListener('DOMContentLoaded', () => {
    const transactionsTableBody = document.querySelector('#transactions-table tbody');
    const balanceElement = document.getElementById('balance');
    const addTransactionForm = document.getElementById('add-transaction-form');
    const loadTransactionsButton = document.getElementById('load-transactions-button');
    const exportButton = document.getElementById('export-button');
    const apiBaseUrl = 'https://localhost:7060/budgettransaction';

    const typeSelect = document.getElementById('type');
    const categorySelect = document.getElementById('category');

    const categories = {
        income: ['Salary', 'Sales', 'Allowance', 'Side Hustle'],
        expense: ['Entertainment', 'Groceries', 'Subscriptions']
    };

    function updateCategories() {
        const selectedType = typeSelect.value;
        const selectedCategories = categories[selectedType];

        // Clear existing options
        categorySelect.innerHTML = '';

        // Add new options
        selectedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.toLowerCase().replace(/\s+/g, '');
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    // Update categories on page load
    updateCategories();

    // Update categories when type changes
    typeSelect.addEventListener('change', updateCategories);

    let transactions = [];

    async function fetchTransactions() {
        try {
            const response = await fetch(apiBaseUrl);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            transactions = await response.json();
            console.log('Fetched transactions:', transactions); // Log fetched transactions
            renderTransactions();
            updateBalance();
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        }
    }

    function renderTransactions() {
        transactionsTableBody.innerHTML = '';
        const recentTransactions = transactions.slice(-10);
        recentTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="ID">${transaction.id}</td>
                <td data-label="Amount">${transaction.amount}</td>
                <td data-label="Category">${transaction.category}</td>
                <td data-label="Date">${new Date(transaction.date).toLocaleDateString()}</td>
                <td data-label="Description">${transaction.description}</td>
                <td data-label="Actions">
                    <button data-id="${transaction.id}" class="edit-button">Edit</button>
                    <button data-id="${transaction.id}" class="delete-button">Delete</button>
                </td>
            `;
            transactionsTableBody.appendChild(row);
        });
    }

    transactionsTableBody.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('edit-button')) {
            const id = target.dataset.id; // Get ID from data-id attribute
            console.log(`Edit button clicked for ID: ${id}`); // Debug log
            editTransaction(id);
        } else if (target.classList.contains('delete-button')) {
            const id = target.dataset.id; // Get ID from data-id attribute
            console.log(`Delete button clicked for ID: ${id}`); // Debug log
            deleteTransaction(id);
        }
    });

    function updateBalance() {
        let balance = 0;
        transactions.forEach(transaction => {
            if (transaction && transaction.type && transaction.type.toLowerCase() === 'income') {
                balance += parseFloat(transaction.amount) || 0;
            } else if (transaction && transaction.type && transaction.type.toLowerCase() === 'expense') {
                balance -= parseFloat(transaction.amount) || 0;
            }
        });
        console.log('Calculated balance:', balance); // Log calculated balance
        balanceElement.innerText = balance.toFixed(2);
        if (balance < 0) {
            balanceElement.classList.add('negative-balance');
        } else {
            balanceElement.classList.remove('negative-balance');
        }
    }

    function resetForm() {
        addTransactionForm.reset();
        updateCategories();
        const transactionIdInput = document.getElementById('transaction-id');
        if (transactionIdInput) {
            transactionIdInput.remove();
        }
    }

    addTransactionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const transactionId = document.getElementById('transaction-id') ? document.getElementById('transaction-id').value : null;

        const newTransaction = { type, category, amount, date: new Date().toISOString(), description };

        try {
            let response;
            if (transactionId) {
                // Update existing transaction
                response = await fetch(`${apiBaseUrl}/${transactionId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newTransaction)
                });
            } else {
                // Add new transaction
                response = await fetch(apiBaseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newTransaction)
                });
            }

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const createdOrUpdatedTransaction = await response.json();
            
            if (transactionId) {
                // Update transaction in the local array
                const index = transactions.findIndex(t => t.id === transactionId);
                transactions[index] = createdOrUpdatedTransaction;
            } else {
                // Add new transaction to the local array
                transactions.push(createdOrUpdatedTransaction);
            }

            console.log(`${transactionId ? 'Updated' : 'Added'} transaction:`, createdOrUpdatedTransaction); // Log added or updated transaction

            renderTransactions();
            updateBalance();
            resetForm();
        } catch (error) {
            console.error(`Failed to ${transactionId ? 'update' : 'add'} transaction:`, error);
        }
    });

    async function deleteTransaction(id) {
        try {
            const response = await fetch(`${apiBaseUrl}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            transactions = transactions.filter(transaction => transaction.id !== id);
            console.log(`Deleted transaction with ID: ${id}`); // Debug log
            renderTransactions();
            updateBalance();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        }
    }

    function editTransaction(id) {
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
            console.log(`Editing transaction with ID: ${id}`, transaction); // Debug log
            document.getElementById('type').value = transaction.type;
            updateCategories();
            document.getElementById('category').value = transaction.category;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('description').value = transaction.description;

            // Add a hidden input to store the ID of the transaction being edited
            let transactionIdInput = document.getElementById('transaction-id');
            if (!transactionIdInput) {
                transactionIdInput = document.createElement('input');
                transactionIdInput.type = 'hidden';
                transactionIdInput.id = 'transaction-id';
                addTransactionForm.appendChild(transactionIdInput);
            }
            transactionIdInput.value = transaction.id;
        }
    }

    exportButton.addEventListener('click', () => {
        exportToCSV(transactions);
    });

    function exportToCSV(transactions) {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Type,Category,Amount,Date,Description\n";
        transactions.forEach(transaction => {
            let row = `${transaction.id},${transaction.type},${transaction.category},${transaction.amount},${transaction.date},${transaction.description}`;
            csvContent += row + "\r\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transactions.csv");
        document.body.appendChild(link);
        link.click();
    }

    loadTransactionsButton.addEventListener('click', fetchTransactions);

    fetchTransactions(); // Optionally, you can call this to load transactions on page load
});

