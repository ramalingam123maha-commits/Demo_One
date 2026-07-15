"""Bank Management Console application.

Currently supports a single action: depositing money into an account.
"""


class Account:
    """A simple bank account holding a balance."""

    def __init__(self, owner, balance=0.0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        """Deposit a positive amount into the account.

        Returns the new balance. Raises ValueError for non-positive amounts.
        """
        if amount <= 0:
            raise ValueError("Deposit amount must be greater than zero.")
        self.balance += amount
        return self.balance


def prompt_deposit_amount():
    """Prompt the user for a deposit amount, re-prompting on invalid input."""
    while True:
        raw = input("Enter amount to deposit: ").strip()
        try:
            amount = float(raw)
        except ValueError:
            print("Invalid input. Please enter a numeric value.")
            continue
        if amount <= 0:
            print("Amount must be greater than zero.")
            continue
        return amount


def main():
    print("=" * 40)
    print("      Bank Management Console")
    print("=" * 40)

    owner = input("Enter account holder name: ").strip() or "Guest"
    account = Account(owner)

    while True:
        print("\nPlease select an action:")
        print("  1. Deposit Money")
        print("  0. Exit")
        choice = input("Your choice: ").strip()

        if choice == "1":
            amount = prompt_deposit_amount()
            new_balance = account.deposit(amount)
            print(f"Deposited ${amount:.2f}. New balance: ${new_balance:.2f}")
        elif choice == "0":
            print("Thank you for using Bank Management Console. Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")


if __name__ == "__main__":
    main()
