# FireOps Security Specifications & TDD Plan

## 1. Data Invariants

1.  **Users Invariants**:
    *   No user can manipulate another user's role or password.
    *   Administrator has full profiles lookup and access capabilities.
2.  **SKU Invariants**:
    *   Only authorized Admins can write, delete or create new system SKU lines.
3.  **Inventory Invariants**:
    *   Store Managers and Admins can update warehouse inventory levels.
4.  **Stock Requests Invariants**:
    *   Engineers can only submit requests for their own email.
    *   Only Store Managers and Admins can transition status from 'Pending' to 'Approved' or 'Rejected'.
5.  **Productivity Logs Invariants**:
    *   Only Engineers can submit daily productivity logs under their validated email.
    *   Team Leaders can edit logs to transition status to 'Validated' and add feedback comments.
    *   Admins can transition status to 'Approved' or 'Rejected' and allocate earned incentive values.

---

## 2. The "Dirty Dozen" Poison Payloads

The following payloads attempt to breach identity, role integrity, or operational flow limits, and must be rejected:
1.  **Identity Spoofing on User Profile creation**: Regular user setting themselves as an `Admin`.
2.  **System SKU Poisoning**: Regular Engineer creating a custom high-cost SKU.
3.  **Rogue Stock Request Creation**: Regular Engineer requesting parts under another engineer's identity.
4.  **Illegal Stock Request Transition**: Engineer bypasses Store Manager and self-approves their own stocking request.
5.  **Illegal Productivity Log Approval**: Team leader marking their own log as `Approved` (Admins only).
6.  **Arbitrary Inventory Level Elevation**: Engineer setting inventory quantity of high-value items in the main warehouse to `9999`.
7.  **Null-Validation Log Injection**: Engineer submitting a productivity log missing required fields or exceeding standard size limits.
8.  **Orphaned Log Creation**: Engineer submitting log with non-existent or invalid date structures.
9.  **Immutability Override on SKU ID**: Overwriting `id` field of a registered SKU document.
10. **Shadow Field injection to User Profile**: Attempting to set unauthorized system status flags inside User profile object.
11. **Rogue Attendance Forging**: Engineer marking themselves as "Present" on days they did not work without Team Leader oversight.
12. **Malicious Negative-Valued Quantity**: Supplying a negative stock or quantity adjustment inside replenishment requests.

---

## 3. Test Coverage

All dirty payloads receive `PERMISSION_DENIED` status on the Firestore Gateway.
