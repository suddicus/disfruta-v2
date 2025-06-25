// contracts/UserRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title UserRegistry
 * @dev Manages user registration, KYC verification, and profile management
 * @dev Implements role-based access control for verification processes
 */
contract UserRegistry is AccessControl, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant KYC_VERIFIER_ROLE = keccak256("KYC_VERIFIER_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    
    // User verification levels
    enum VerificationLevel {
        UNVERIFIED,     // Default state
        EMAIL_VERIFIED, // Email verification complete
        PHONE_VERIFIED, // Phone verification complete
        ID_VERIFIED,    // Government ID verified
        FULL_VERIFIED   // Complete KYC verification
    }
    
    // User profile structure
    struct UserProfile {
        string email;
        string phoneNumber;
        string firstName;
        string lastName;
        string country;
        string documentType;    // "passport", "drivers_license", "national_id"
        string documentNumber;
        VerificationLevel verificationLevel;
        uint256 registrationDate;
        uint256 lastVerificationDate;
        bool isActive;
        bool isBorrower;
        bool isLender;
        uint256 totalLoansAsLender;
        uint256 totalLoansAsBorrower;
        uint256 reputationScore;   // 0-1000 scale
    }
    
    // KYC document structure
    struct KYCDocument {
        string documentHash;     // IPFS hash or encrypted hash
        string documentType;
        uint256 uploadDate;
        uint256 verificationDate;
        bool isVerified;
        address verifiedBy;
        string verificationNotes;
    }
    
    // Compliance tracking
    struct ComplianceRecord {
        bool amlChecked;         // Anti-Money Laundering check
        bool sanctionChecked;    // Sanctions list check
        bool pepChecked;         // Politically Exposed Person check
        uint256 riskScore;       // Risk assessment score (0-100)
        uint256 lastComplianceCheck;
        string complianceNotes;
    }
    
    // State variables
    mapping(address => UserProfile) public userProfiles;
    mapping(address => KYCDocument[]) public userDocuments;
    mapping(address => ComplianceRecord) public complianceRecords;
    mapping(string => address) public emailToAddress;
    mapping(string => address) public phoneToAddress;
    mapping(address => bool) public verifiedUsers;
    
    // Platform statistics
    uint256 public totalUsers;
    uint256 public totalVerifiedUsers;
    uint256 public totalBorrowers;
    uint256 public totalLenders;
    
    // Verification requirements
    uint256 public constant MIN_AGE_REQUIREMENT = 18;
    mapping(string => bool) public supportedCountries;
    mapping(string => bool) public supportedDocumentTypes;
    
    // Events
    event UserRegistered(
        address indexed user,
        string email,
        uint256 timestamp
    );
    
    event VerificationLevelUpdated(
        address indexed user,
        VerificationLevel oldLevel,
        VerificationLevel newLevel,
        address verifiedBy,
        uint256 timestamp
    );
    
    event DocumentUploaded(
        address indexed user,
        string documentType,
        string documentHash,
        uint256 timestamp
    );
    
    event DocumentVerified(
        address indexed user,
        string documentType,
        address verifiedBy,
        uint256 timestamp
    );
    
    event ComplianceCheckCompleted(
        address indexed user,
        uint256 riskScore,
        bool passed,
        uint256 timestamp
    );
    
    event UserDeactivated(
        address indexed user,
        string reason,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        address indexed user,
        uint256 oldScore,
        uint256 newScore,
        string reason
    );
    
    // Custom errors
    error UserAlreadyRegistered();
    error UserNotFound();
    error InvalidVerificationLevel();
    error DocumentNotFound();
    error InvalidCountry();
    error InvalidDocumentType();
    error InsufficientVerification();
    error ComplianceCheckFailed();
    
    constructor() {
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(KYC_VERIFIER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
        
        // Initialize supported countries (major markets)
        supportedCountries["US"] = true;
        supportedCountries["CA"] = true;
        supportedCountries["UK"] = true;
        supportedCountries["DE"] = true;
        supportedCountries["FR"] = true;
        supportedCountries["AU"] = true;
        supportedCountries["SG"] = true;
        supportedCountries["JP"] = true;
        
        // Initialize supported document types
        supportedDocumentTypes["passport"] = true;
        supportedDocumentTypes["drivers_license"] = true;
        supportedDocumentTypes["national_id"] = true;
        supportedDocumentTypes["residence_permit"] = true;
    }
    
    /**
     * @dev Registers a new user
     * @param _email User's email address
     * @param _phoneNumber User's phone number
     * @param _firstName User's first name
     * @param _lastName User's last name
     * @param _country User's country code (ISO 2-letter)
     */
    function registerUser(
        string memory _email,
        string memory _phoneNumber,
        string memory _firstName,
        string memory _lastName,
        string memory _country
    ) external whenNotPaused {
        if (userProfiles[msg.sender].registrationDate != 0) {
            revert UserAlreadyRegistered();
        }
        
        if (!supportedCountries[_country]) {
            revert InvalidCountry();
        }
        
        // Create user profile
        userProfiles[msg.sender] = UserProfile({
            email: _email,
            phoneNumber: _phoneNumber,
            firstName: _firstName,
            lastName: _lastName,
            country: _country,
            documentType: "",
            documentNumber: "",
            verificationLevel: VerificationLevel.UNVERIFIED,
            registrationDate: block.timestamp,
            lastVerificationDate: 0,
            isActive: true,
            isBorrower: false,
            isLender: false,
            totalLoansAsLender: 0,
            totalLoansAsBorrower: 0,
            reputationScore: 500 // Start with neutral score
        });
        
        // Initialize compliance record
        complianceRecords[msg.sender] = ComplianceRecord({
            amlChecked: false,
            sanctionChecked: false,
            pepChecked: false,
            riskScore: 50, // Default medium risk
            lastComplianceCheck: 0,
            complianceNotes: ""
        });
        
        // Update mappings
        emailToAddress[_email] = msg.sender;
        phoneToAddress[_phoneNumber] = msg.sender;
        totalUsers++;
        
        emit UserRegistered(msg.sender, _email, block.timestamp);
    }
    
    /**
     * @dev Uploads KYC document
     * @param _documentType Type of document
     * @param _documentHash IPFS hash or encrypted hash of document
     * @param _documentNumber Document number/identifier
     */
    function uploadKYCDocument(
        string memory _documentType,
        string memory _documentHash,
        string memory _documentNumber
    ) external whenNotPaused {
        if (userProfiles[msg.sender].registrationDate == 0) {
            revert UserNotFound();
        }
        
        if (!supportedDocumentTypes[_documentType]) {
            revert InvalidDocumentType();
        }
        
        // Add document to user's records
        userDocuments[msg.sender].push(KYCDocument({
            documentHash: _documentHash,
            documentType: _documentType,
            uploadDate: block.timestamp,
            verificationDate: 0,
            isVerified: false,
            verifiedBy: address(0),
            verificationNotes: ""
        }));
        
        // Update user profile with primary document info
        if (bytes(userProfiles[msg.sender].documentType).length == 0) {
            userProfiles[msg.sender].documentType = _documentType;
            userProfiles[msg.sender].documentNumber = _documentNumber;
        }
        
        emit DocumentUploaded(msg.sender, _documentType, _documentHash, block.timestamp);
    }
    
    /**
     * @dev Verifies user's KYC document (KYC verifier only)
     * @param _user Address of the user
     * @param _documentIndex Index of the document to verify
     * @param _approved Whether the document is approved
     * @param _notes Verification notes
     */
    function verifyKYCDocument(
        address _user,
        uint256 _documentIndex,
        bool _approved,
        string memory _notes
    ) external onlyRole(KYC_VERIFIER_ROLE) whenNotPaused {
        if (userProfiles[_user].registrationDate == 0) {
            revert UserNotFound();
        }
        
        if (_documentIndex >= userDocuments[_user].length) {
            revert DocumentNotFound();
        }
        
        KYCDocument storage document = userDocuments[_user][_documentIndex];
        document.isVerified = _approved;
        document.verificationDate = block.timestamp;
        document.verifiedBy = msg.sender;
        document.verificationNotes = _notes;
        
        if (_approved) {
            // Update verification level
            VerificationLevel oldLevel = userProfiles[_user].verificationLevel;
            userProfiles[_user].verificationLevel = VerificationLevel.ID_VERIFIED;
            userProfiles[_user].lastVerificationDate = block.timestamp;
            
            emit VerificationLevelUpdated(
                _user,
                oldLevel,
                VerificationLevel.ID_VERIFIED,
                msg.sender,
                block.timestamp
            );
        }
        
        emit DocumentVerified(_user, document.documentType, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Performs compliance checks (compliance officer only)
     * @param _user Address of the user
     * @param _amlPassed AML check result
     * @param _sanctionPassed Sanctions check result
     * @param _pepPassed PEP check result
     * @param _riskScore Overall risk score (0-100)
     * @param _notes Compliance notes
     */
    function performComplianceCheck(
        address _user,
        bool _amlPassed,
        bool _sanctionPassed,
        bool _pepPassed,
        uint256 _riskScore,
        string memory _notes
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        if (userProfiles[_user].registrationDate == 0) {
            revert UserNotFound();
        }
        
        require(_riskScore <= 100, "Invalid risk score");
        
        ComplianceRecord storage record = complianceRecords[_user];
        record.amlChecked = _amlPassed;
        record.sanctionChecked = _sanctionPassed;
        record.pepChecked = _pepPassed;
        record.riskScore = _riskScore;
        record.lastComplianceCheck = block.timestamp;
        record.complianceNotes = _notes;
        
        bool passed = _amlPassed && _sanctionPassed && _pepPassed && _riskScore <= 70;
        
        if (passed && userProfiles[_user].verificationLevel == VerificationLevel.ID_VERIFIED) {
            // Grant full verification
            VerificationLevel oldLevel = userProfiles[_user].verificationLevel;
            userProfiles[_user].verificationLevel = VerificationLevel.FULL_VERIFIED;
            userProfiles[_user].lastVerificationDate = block.timestamp;
            verifiedUsers[_user] = true;
            totalVerifiedUsers++;
            
            emit VerificationLevelUpdated(
                _user,
                oldLevel,
                VerificationLevel.FULL_VERIFIED,
                msg.sender,
                block.timestamp
            );
        }
        
        emit ComplianceCheckCompleted(_user, _riskScore, passed, block.timestamp);
    }
    
    /**
     * @dev Updates user role as borrower or lender
     * @param _user Address of the user
     * @param _isBorrower Whether user is a borrower
     * @param _isLender Whether user is a lender
     */
    function updateUserRole(
        address _user,
        bool _isBorrower,
        bool _isLender
    ) external onlyRole(ADMIN_ROLE) {
        if (userProfiles[_user].registrationDate == 0) {
            revert UserNotFound();
        }
        
        UserProfile storage profile = userProfiles[_user];
        
        // Update counters if role is being added
        if (!profile.isBorrower && _isBorrower) {
            totalBorrowers++;
        } else if (profile.isBorrower && !_isBorrower) {
            totalBorrowers--;
        }
        
        if (!profile.isLender && _isLender) {
            totalLenders++;
        } else if (profile.isLender && !_isLender) {
            totalLenders--;
        }
        
        profile.isBorrower = _isBorrower;
        profile.isLender = _isLender;
    }
    
    /**
     * @dev Updates user's reputation score
     * @param _user Address of the user
     * @param _newScore New reputation score (0-1000)
     * @param _reason Reason for the update
     */
    function updateReputationScore(
        address _user,
        uint256 _newScore,
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) {
        if (userProfiles[_user].registrationDate == 0) {
            revert UserNotFound();
        }
        
        require(_newScore <= 1000, "Invalid reputation score");
        
        uint256 oldScore = userProfiles[_user].reputationScore;
        userProfiles[_user].reputationScore = _newScore;
        
        emit ReputationUpdated(_user, oldScore, _newScore, _reason);
    }
    
    /**
     * @dev Updates loan statistics for user
     * @param _user Address of the user
     * @param _asLender Whether the loan is as a lender
     */
    function updateLoanStatistics(address _user, bool _asLender) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (userProfiles[_user].registrationDate == 0) {
            revert UserNotFound();
        }
        
        if (_asLender) {
            userProfiles[_user].totalLoansAsLender++;
        } else {
            userProfiles[_user].totalLoansAsBorrower++;
        }
    }
    
    /**
     * @dev Deactivates a user account
     * @param _user Address of the user
     * @param _reason Reason for deactivation
     */
    function deactivateUser(
        address _user,
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) {
        if (userProfiles[_user].registrationDate == 0) {
            revert UserNotFound();
        }
        
        userProfiles[_user].isActive = false;
        verifiedUsers[_user] = false;
        
        if (userProfiles[_user].verificationLevel == VerificationLevel.FULL_VERIFIED) {
            totalVerifiedUsers--;
        }
        
        emit UserDeactivated(_user, _reason, block.timestamp);
    }
    
    /**
     * @dev Adds supported country
     * @param _countryCode ISO 2-letter country code
     */
    function addSupportedCountry(string memory _countryCode) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        supportedCountries[_countryCode] = true;
    }
    
    /**
     * @dev Removes supported country
     * @param _countryCode ISO 2-letter country code
     */
    function removeSupportedCountry(string memory _countryCode) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        supportedCountries[_countryCode] = false;
    }
    
    /**
     * @dev Pauses the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpauses the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // View functions
    
    /**
     * @dev Checks if user is verified
     * @param _user Address of the user
     * @return Boolean indicating verification status
     */
    function isVerified(address _user) external view returns (bool) {
        return verifiedUsers[_user] && userProfiles[_user].isActive;
    }
    
    /**
     * @dev Gets user profile
     * @param _user Address of the user
     * @return UserProfile struct
     */
    function getUserProfile(address _user) 
        external 
        view 
        returns (UserProfile memory) 
    {
        return userProfiles[_user];
    }
    
    /**
     * @dev Gets user's KYC documents
     * @param _user Address of the user
     * @return Array of KYCDocument structs
     */
    function getUserDocuments(address _user) 
        external 
        view 
        returns (KYCDocument[] memory) 
    {
        return userDocuments[_user];
    }
    
    /**
     * @dev Gets compliance record
     * @param _user Address of the user
     * @return ComplianceRecord struct
     */
    function getComplianceRecord(address _user) 
        external 
        view 
        returns (ComplianceRecord memory) 
    {
        return complianceRecords[_user];
    }
    
    /**
     * @dev Gets platform statistics
     * @return total Total users
     * @return verified Total verified users
     * @return borrowers Total borrowers
     * @return lenders Total lenders
     */
    function getPlatformStats() 
        external 
        view 
        returns (
            uint256 total,
            uint256 verified,
            uint256 borrowers,
            uint256 lenders
        ) 
    {
        return (totalUsers, totalVerifiedUsers, totalBorrowers, totalLenders);
    }
    
    /**
     * @dev Checks if user can borrow
     * @param _user Address of the user
     * @return Boolean indicating borrowing eligibility
     */
    function canBorrow(address _user) external view returns (bool) {
        UserProfile storage profile = userProfiles[_user];
        return profile.isActive && 
               verifiedUsers[_user] && 
               profile.verificationLevel == VerificationLevel.FULL_VERIFIED &&
               complianceRecords[_user].riskScore <= 70;
    }
    
    /**
     * @dev Checks if user can lend
     * @param _user Address of the user
     * @return Boolean indicating lending eligibility
     */
    function canLend(address _user) external view returns (bool) {
        UserProfile storage profile = userProfiles[_user];
        return profile.isActive && 
               verifiedUsers[_user] && 
               profile.verificationLevel >= VerificationLevel.ID_VERIFIED;
    }
    
    /**
     * @dev Gets user by email
     * @param _email Email address
     * @return Address of the user
     */
    function getUserByEmail(string memory _email) external view returns (address) {
        return emailToAddress[_email];
    }
    
    /**
     * @dev Gets user by phone
     * @param _phone Phone number
     * @return Address of the user
     */
    function getUserByPhone(string memory _phone) external view returns (address) {
        return phoneToAddress[_phone];
    }
    
    /**
     * @dev Checks if country is supported
     * @param _countryCode ISO 2-letter country code
     * @return Boolean indicating support status
     */
    function isCountrySupported(string memory _countryCode) external view returns (bool) {
        return supportedCountries[_countryCode];
    }
    
    /**
     * @dev Checks if document type is supported
     * @param _documentType Document type
     * @return Boolean indicating support status
     */
    function isDocumentTypeSupported(string memory _documentType) external view returns (bool) {
        return supportedDocumentTypes[_documentType];
    }
}