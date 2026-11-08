# Product Definition

## Problem

Important work arrives through different channels, including email, but not every message requires action. A conventional ticketing workflow can create noise by turning every incoming message into a ticket. taskDesk is intended to help one person identify commitments and follow-ups without losing context or control.

## Product vision

A lightweight personal work hub where actionable information becomes a clear task with an owner, status, priority, due date, and history.

## Target user

Initially, one individual managing personal work and follow-ups. The data model should not prevent multi-user support later, but multi-tenant complexity is not part of the first MVP.

## MVP goals

1. Provide a focused dashboard for manually managed tasks.
2. Support a simple, understandable task lifecycle.
3. Make priorities and due dates visible.
4. Preserve a small activity history for task changes and comments.
5. Provide useful demo data without requiring external accounts.
6. Establish a safe foundation for future email integrations.

## MVP non-goals

- Gmail or Microsoft 365 connection.
- OAuth and mailbox synchronization.
- AI classification or autonomous task creation.
- Sending, deleting, archiving, or replying to emails.
- Team assignment, enterprise workflows, billing, or complex permissions.
- Mobile native applications.

## Task lifecycle

| Status | Meaning |
| --- | --- |
| New | Created and not yet started |
| In progress | Work is actively being done |
| Waiting for response | Blocked while awaiting another person or event |
| Completed | Work is finished |

A task should have a clear title. Optional fields include description, priority, due date, origin/reference, and activity history. Status changes should be explicit and recorded.

## Priorities

Use a small scale: Low, Normal, High, and Urgent. Avoid introducing complex scoring in the MVP.

## Core user stories

- As a user, I can create a task manually so I can capture a commitment immediately.
- As a user, I can edit and complete a task so the dashboard reflects reality.
- As a user, I can change a task's status and priority.
- As a user, I can filter tasks by status and priority.
- As a user, I can see overdue and upcoming tasks.
- As a user, I can inspect a task's activity history.
- As a user, I can distinguish demo data from my own records.

## Future email triage direction

When email integrations are introduced, classify messages into:
- Actionable: likely requires a task or follow-up.
- Informational: no task required.
- Inconclusive: needs human review.
- Related: belongs to an existing task.

The system should explain why it made a suggestion and expose confidence where applicable. Initially, every suggested task requires user approval. A message must not be converted into a task merely because it is an email.

## Success criteria

The MVP is useful when the user can manage a realistic set of tasks end-to-end, refresh the page without losing persisted data, and understand what needs attention without connecting any mailbox.
