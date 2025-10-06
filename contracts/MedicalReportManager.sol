
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Medical Report Manager
/// @notice Stores metadata for encrypted medical reports and per-user encrypted symmetric keys.
/// @dev All on-chain stored keys are ciphertext (encrypted with user public keys). The contract does not store plaintext.
contract MedicalReportManager {
    uint256 public reportCount;

    struct Report {
        uint256 id;
        address owner;
        string cid; // IPFS CID of encrypted file
        string description;
        uint256 timestamp;
    }

    // reportId => Report
    mapping(uint256 => Report) public reports;

    // reportId => (user => encryptedSymmetricKeyBase64)
    mapping(uint256 => mapping(address => string)) private encryptedKeys;

    // reportId => authorized addresses (helps to enumerate authorized list)
    mapping(uint256 => address[]) public authorizedList;

    // events
    event ReportCreated(uint256 indexed reportId, address indexed owner, string cid);
    event AccessGranted(uint256 indexed reportId, address indexed grantee);
    event AccessRevoked(uint256 indexed reportId, address indexed revoked);

    modifier onlyOwner(uint256 reportId) {
        require(reports[reportId].owner == msg.sender, "Only owner can call");
        _;
    }

    /// @notice Create a new report record. The caller must include themselves in recipients.
    /// @param cid IPFS CID of the encrypted file
    /// @param description short description
    /// @param recipients array of addresses who should receive the encrypted key (must include msg.sender)
    /// @param encryptedKeysForRecipients array of base64 ciphertexts of symmetric key (aligned with recipients)
    function createReport(
        string calldata cid,
        string calldata description,
        address[] calldata recipients,
        string[] calldata encryptedKeysForRecipients
    ) external returns (uint256) {
        require(recipients.length == encryptedKeysForRecipients.length, "recipients/encryptedKeys mismatch");
        bool ownerIncluded = false;
        for (uint i = 0; i < recipients.length; i++) {
            if (recipients[i] == msg.sender) {
                ownerIncluded = true;
                break;
            }
        }
        require(ownerIncluded, "Owner must be included in recipients");

        uint256 id = ++reportCount;
        reports[id] = Report({
            id: id,
            owner: msg.sender,
            cid: cid,
            description: description,
            timestamp: block.timestamp
        });

        for (uint i = 0; i < recipients.length; i++) {
            address r = recipients[i];
            encryptedKeys[id][r] = encryptedKeysForRecipients[i];
            authorizedList[id].push(r);
            emit AccessGranted(id, r);
        }

        emit ReportCreated(id, msg.sender, cid);
        return id;
    }

    /// @notice Grant access to a user for a report. Only owner can call.
    /// @param reportId id of report
    /// @param user address to grant
    /// @param encryptedSymmetricKeyBase64 ciphertext encrypted with user's public key
    function grantAccess(uint256 reportId, address user, string calldata encryptedSymmetricKeyBase64) external onlyOwner(reportId) {
        require(bytes(encryptedKeys[reportId][user]).length == 0, "Already has access");
        encryptedKeys[reportId][user] = encryptedSymmetricKeyBase64;
        authorizedList[reportId].push(user);
        emit AccessGranted(reportId, user);
    }

    /// @notice Revoke access from a user. Note: revoking here prevents convenient retrieval but the encrypted key remains on-chain historically.
    function revokeAccess(uint256 reportId, address user) external onlyOwner(reportId) {
        require(bytes(encryptedKeys[reportId][user]).length != 0, "User has no access");
        delete encryptedKeys[reportId][user];

        // remove from authorizedList (simple loop)
        address[] storage list = authorizedList[reportId];
        for (uint i = 0; i < list.length; i++) {
            if (list[i] == user) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
        emit AccessRevoked(reportId, user);
    }

    /// @notice Return the report metadata.
    function getReport(uint256 reportId) external view returns (Report memory) {
        return reports[reportId];
    }

    /// @notice Returns base64 encrypted symmetric key for the caller (msg.sender). Empty string if not present.
    function getMyEncryptedKey(uint256 reportId) external view returns (string memory) {
        return encryptedKeys[reportId][msg.sender];
    }

    /// @notice Helper: returns whether an address is authorized.
    function isAuthorized(uint256 reportId, address user) external view returns (bool) {
        return bytes(encryptedKeys[reportId][user]).length != 0;
    }

    /// @notice Returns list of authorized addresses for a report
    function getAuthorizedList(uint256 reportId) external view returns (address[] memory) {
        return authorizedList[reportId];
    }
}