# Security Specification - TimeTrack

## 1. Data Invariants
- A user can only access their own profile and projects.
- A project must belong to a valid user.
- A day entry must belong to a valid project.
- Timestamps must be server-generated.
- Emails must be verified (Google Login handles this, but rules should check).

## 2. The "Dirty Dozen" Payloads (Denial Scenarios)
1. **Identity Spoofing**: Attempt to create a project for another user ID.
2. **Access Breach**: Authenticated User A tries to read Project 123 belonging to User B.
3. **Ghost Fields**: Update a project with an extra field `isAdmin: true`.
4. **ID Poisoning**: Use a 2KB string as a project ID.
5. **PII Leak**: Non-owner tries to read another user's email.
6. **Immutability Breach**: Attempt to change `createdAt` on an existing project.
7. **Type Mismatch**: Send `basicRate: "expensive"` instead of a number.
8. **Size Overload**: Send a 1MB string in the `name` field.
9. **Relational Orphan**: Create an entry for a non-existent project.
10. **State Shortcutting**: (Not applicable yet, but valid for workflow apps).
11. **Negative Rates**: Set `basicRate: -100`.
12. **Future Dates**: (Usually logic level, but rules can restrict if needed).

## 3. Test Runner (Draft)
The tests will verify that all the above payloads return `PERMISSION_DENIED`.
