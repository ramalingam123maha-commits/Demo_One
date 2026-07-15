"""Bank Management Console.

A simple console application that currently supports the
"Check Balance" action only.
"""


class Account:
    """Represents a single bank account."""

    def __init__(self, account_number, holder_name, balance):
        self.account_number = account_number
        self.holder_name = holder_name
        self.balance = balance


# Sample account data used by the console.
ACCOUNTS = {
    "1001": Account("1001", "Alice Johnson", 2500.75),
    "1002": Account("1002", "Bob Smith", 1340.00),
    "1003": Account("1003", "Carol White", 980.50),
}


def check_balance(accounts, account_number):
    """Return the account for the given number, or None if not found."""
    return accounts.get(account_number)


def print_menu():
    print("\n===== Bank Management Console =====")
    print("1. Check Balance")
    print("0. Exit")


def run():
    while True:
        print_menu()
        choice = input("Select an option: ").strip()

        if choice == "1":
            account_number = input("Enter your account number: ").strip()
            account = check_balance(ACCOUNTS, account_number)
            if account is None:
                print("Account not found. Please try again.")
            else:
                print(
                    f"\nAccount Holder: {account.holder_name}"
                    f"\nAccount Number: {account.account_number}"
                    f"\nCurrent Balance: ${account.balance:,.2f}"
                )
        elif choice == "0":
            print("Thank you for using the Bank Management Console. Goodbye!")
            break
        else:
            print("Invalid option. Please select 1 or 0.")


if __name__ == "__main__":
    run()
