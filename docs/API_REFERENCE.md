# RoomOS API Reference

Base URL: `https://prospine.in/roomOS/server/public`

## Authentication

### Register
Create a new user account.

- **Endpoint**: `/auth/register`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```
- **Response (201)**:
  ```json
  {
    "message": "User registered successfully",
    "user_id": 123
  }
  ```

### Login
Authenticate a user and receive a session token.

- **Endpoint**: `/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```
- **Response (200)**:
  ```json
  {
    "token": "abcdef123456...",
    "user": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member",
      "group_id": 1
    }
  }
  ```

## Transactions

### List Transactions
Get a list of recent transactions and current balances.

- **Endpoint**: `/transactions/list`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200)**:
  ```json
  {
    "transactions": [
      {
        "id": 1,
        "amount": "50.00",
        "description": "Groceries",
        "user_name": "John Doe",
        "created_at": "2023-10-27 10:00:00"
      }
    ],
    "balances": [
      {
        "other_user_id": 456,
        "other_user_name": "Jane Smith",
        "balance": -25.00
      }
    ],
    "my_balance": 25.00
  }
  ```

### Add Transaction
Record a new expense.

- **Endpoint**: `/transactions/add`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "amount": 50.00,
    "description": "Groceries",
    "split_between": [123, 456] // Optional: IDs of users to split with
  }
  ```
- **Response (200)**:
  ```json
  {
    "message": "Transaction added"
  }
  ```

### Delete Transaction
Remove a transaction and revert balances.

- **Endpoint**: `/transactions/delete`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "transaction_id": 1
  }
  ```
- **Response (200)**:
  ```json
  {
    "message": "Transaction deleted successfully"
  }
  ```

## Groups

*(Inferred from Schema)*

- **Table**: `groups`
- **Fields**: `id`, `name`, `created_at`

## Roster

*(Inferred from Schema)*

- **Table**: `roster`
- **Fields**: `id`, `group_id`, `day_index`, `morning` (JSON), `night` (JSON), `passenger_m`, `passenger_n`

## Chat

*(Inferred from Schema)*

- **Table**: `chat_messages`
- **Fields**: `id`, `group_id`, `user_id`, `message`, `created_at`
