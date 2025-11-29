# Spring Boot Migration Plan for Namahatta Management System

## Overview
This document provides a detailed, task-based migration plan to move the Namahatta Management System backend from Node.js/Express to Spring Boot while maintaining 100% functionality and API compatibility. The migration uses the **same PostgreSQL database** with no schema changes required.

## Why Spring Boot Migration?

### Benefits
- **Enterprise-grade framework** with built-in security, validation, and monitoring
- **Better performance** with JVM optimizations and connection pooling
- **Robust ecosystem** with mature libraries and tools
- **Type safety** with Java's strong typing system
- **Production-ready features** like health checks, metrics, and logging
- **Easier scaling** and deployment in enterprise environments

### Migration Approach
- **Zero database changes**: Use existing PostgreSQL schema as-is
- **API compatibility**: Maintain exact same REST endpoints and responses
- **Parallel development**: Build Spring Boot version alongside current Node.js system
- **Gradual migration**: Switch endpoints one by one for safe rollback

## Current Architecture Analysis

### Existing System Overview
- **Runtime**: Node.js 20 with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **Authentication**: JWT tokens in HTTP-only cookies, bcrypt password hashing
- **Session Management**: PostgreSQL sessions with single login enforcement
- **Authorization**: Role-based access (ADMIN, OFFICE, DISTRICT_SUPERVISOR)
- **Data Access**: District-based filtering for supervisors

### Database Schema (12 tables - NO CHANGES NEEDED)
Since we're using the **same database**, no Flyway migrations are needed. The Spring Boot application will connect to your existing PostgreSQL database and use the current schema:

1. **devotees** - Personal information, spiritual status, courses
2. **namahattas** - Spiritual centers with organizational details  
3. **devotional_statuses** - Hierarchical spiritual levels
4. **shraddhakutirs** - Regional spiritual administrative units
5. **leaders** - Hierarchical leadership structure
6. **addresses** - Normalized address data
7. **devotee_addresses** - Junction table for devotee addresses
8. **namahatta_addresses** - Junction table for namahatta addresses
9. **users** - Authentication users with roles
10. **user_districts** - Many-to-many user-district mapping
11. **user_sessions** - Single login enforcement
12. **jwt_blacklist** - Token invalidation

### Current API Endpoints (25+ endpoints to migrate)
All endpoints will maintain exact same behavior:
- `/api/auth/*` - Authentication system (login, logout, verify)
- `/api/devotees/*` - Devotee CRUD operations
- `/api/namahattas/*` - Namahatta CRUD operations
- `/api/statuses/*` - Status management
- `/api/hierarchy/*` - Leadership hierarchy
- `/api/geography/*` - Location data (countries, states, districts)
- `/api/dashboard/*` - Statistics and analytics

## Detailed Migration Tasks

## Phase 1: Project Setup & Infrastructure

### Task 1.1: Create Replit Spring Boot Project
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create new Replit Java project named "namahatta-springboot"
- [ ] Set up Maven project structure with Spring Boot parent
- [ ] Configure `pom.xml` with all required dependencies
- [ ] Create basic application structure in Replit
- [ ] Test basic Spring Boot startup

**Files to create:**
```
pom.xml                           <- Maven configuration
src/main/java/com/namahatta/
├── NamahattaApplication.java     <- Main application class
└── config/
    └── DatabaseConfig.java      <- Database connection
src/main/resources/
├── application.yml              <- Main configuration
└── application-dev.yml          <- Development configuration
```

**Maven Dependencies (pom.xml):**
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.1</version>
</parent>

<dependencies>
    <!-- Core Spring Boot -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    
    <!-- Database -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
    </dependency>
    
    <!-- JWT Authentication -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
    </dependency>
    
    <!-- Documentation -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.1.0</version>
    </dependency>
    
    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

**Validation Criteria:**
- [ ] Spring Boot application starts successfully
- [ ] Can connect to existing PostgreSQL database using same connection string
- [ ] Maven builds without errors
- [ ] Replit workflow runs `mvn spring-boot:run` successfully

---

### Task 1.2: Configure Database Connection
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Purpose**: Connect to your existing Neon PostgreSQL database using the same connection string

**Sub-tasks:**
- [ ] Create `application.yml` with database configuration
- [ ] Set up environment variables for DATABASE_URL, JWT_SECRET, SESSION_SECRET
- [ ] Create `DatabaseConfig.java` for connection pooling
- [ ] Test database connection
- [ ] Verify can read existing data from devotees table

**Configuration Files:**

`application.yml`:
```yaml
spring:
  application:
    name: namahatta-management-system
    
  datasource:
    url: ${DATABASE_URL}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
      
  jpa:
    hibernate:
      ddl-auto: none  # IMPORTANT: Don't modify existing schema
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        
server:
  port: ${PORT:5000}  # Same port as Node.js version
  
jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000  # 24 hours (same as Node.js)
  
session:
  secret: ${SESSION_SECRET}
```

**Validation Criteria:**
- [ ] Application connects to PostgreSQL successfully
- [ ] Can query existing tables (devotees, namahattas, users)
- [ ] Connection pool configured properly
- [ ] Environment variables loaded correctly

---

### Task 1.3: Set Up Replit Configuration
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create `.replit` file for Java/Maven configuration
- [ ] Configure run command for Spring Boot
- [ ] Set up environment variables in Replit Secrets
- [ ] Test hot reload functionality
- [ ] Configure port forwarding for port 5000

**Replit Configuration Files:**

`.replit`:
```toml
run = "mvn spring-boot:run"
entrypoint = "src/main/java/com/namahatta/NamahattaApplication.java"

[languages.java]
pattern = "**/*.java"

[nix]
channel = "stable-22_11"

[gitHubImport]
requiredFiles = [".replit", "replit.nix", "pom.xml"]

[deployment]
run = ["mvn", "clean", "package", "-DskipTests", "&&", "java", "-jar", "target/*.jar"]
```

**Environment Variables to Set in Replit Secrets:**
- `DATABASE_URL` - Your existing Neon PostgreSQL connection string
- `JWT_SECRET` - Same JWT secret from Node.js version
- `SESSION_SECRET` - Same session secret from Node.js version

**Validation Criteria:**
- [ ] Spring Boot starts via `mvn spring-boot:run`
- [ ] Application accessible on port 5000
- [ ] Environment variables loaded from Replit Secrets
- [ ] Hot reload works when editing Java files

## Phase 2: Database Entities & JPA Mapping

### Task 2.1: Create Core Entity Classes
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Purpose**: Map existing PostgreSQL tables to JPA entities without changing database schema

**Sub-tasks:**
- [ ] Create `User.java` entity for authentication
- [ ] Create `Devotee.java` entity with all fields
- [ ] Create `Namahatta.java` entity with all fields
- [ ] Create `DevotionalStatus.java` entity
- [ ] Create `Shraddhakutir.java` entity
- [ ] Create `Leader.java` entity
- [ ] Test entity mapping with simple queries

**Key Entity: User.java**
```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Enumerated(EnumType.STRING)
    private UserRole role; // ADMIN, OFFICE, DISTRICT_SUPERVISOR
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // Many-to-many relationship with districts
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_districts",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "district_code")
    )
    private Set<District> districts = new HashSet<>();
    
    // Getters, setters, constructors
}
```

**Key Entity: Devotee.java**
```java
@Entity
@Table(name = "devotees")
public class Devotee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "legal_name", nullable = false)
    private String legalName;
    
    @Column(name = "name") // Initiated/spiritual name
    private String name;
    
    @Column(name = "dob")
    private String dob; // Keep as String to match current format
    
    @Column(name = "email")
    private String email;
    
    @Column(name = "phone")
    private String phone;
    
    // Family information
    @Column(name = "father_name")
    private String fatherName;
    
    @Column(name = "mother_name")
    private String motherName;
    
    @Column(name = "husband_name")
    private String husbandName;
    
    @Column(name = "gender")
    private String gender;
    
    @Column(name = "blood_group")
    private String bloodGroup;
    
    @Column(name = "marital_status")
    private String maritalStatus;
    
    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "devotional_status_id")
    private DevotionalStatus devotionalStatus;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "namahatta_id")
    private Namahatta namahatta;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shraddhakutir_id")
    private Shraddhakutir shraddhakutir;
    
    // Address relationships
    @OneToMany(mappedBy = "devotee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<DevoteeAddress> addresses = new ArrayList<>();
    
    // Spiritual information
    @Column(name = "initiated_name")
    private String initiatedName;
    
    @Column(name = "harinam_date")
    private String harinamDate;
    
    @Column(name = "pancharatrik_date")
    private String pancharatrikDate;
    
    // Professional information
    @Column(name = "education")
    private String education;
    
    @Column(name = "occupation")
    private String occupation;
    
    // JSON field for devotional courses
    @Column(name = "devotional_courses", columnDefinition = "jsonb")
    @Convert(converter = DevotionalCoursesConverter.class)
    private List<DevotionalCourse> devotionalCourses = new ArrayList<>();
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Getters, setters, constructors
}
```

**Validation Criteria:**
- [ ] All entities compile without errors
- [ ] Can retrieve existing data from each table
- [ ] Relationships work correctly (devotee -> namahatta, devotee -> status)
- [ ] JSON fields (devotional_courses) map correctly

---

### Task 2.2: Create Address & Junction Tables
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create `Address.java` entity for normalized addresses
- [ ] Create `DevoteeAddress.java` junction entity
- [ ] Create `NamahattaAddress.java` junction entity
- [ ] Test address relationships
- [ ] Verify landmark data handling

**Address Entities:**

`Address.java`:
```java
@Entity
@Table(name = "addresses")
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "country")
    private String country;
    
    @Column(name = "state_name_english")
    private String stateNameEnglish;
    
    @Column(name = "district_name_english") 
    private String districtNameEnglish;
    
    @Column(name = "subdistrict_name_english")
    private String subdistrictNameEnglish;
    
    @Column(name = "village_name_english")
    private String villageNameEnglish;
    
    @Column(name = "pincode")
    private String pincode;
    
    // Relationships
    @OneToMany(mappedBy = "address", cascade = CascadeType.ALL)
    private List<DevoteeAddress> devoteeAddresses = new ArrayList<>();
    
    @OneToMany(mappedBy = "address", cascade = CascadeType.ALL)
    private List<NamahattaAddress> namahattaAddresses = new ArrayList<>();
    
    // Getters, setters
}
```

`DevoteeAddress.java`:
```java
@Entity
@Table(name = "devotee_addresses")
public class DevoteeAddress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "devotee_id", nullable = false)
    private Devotee devotee;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id", nullable = false)
    private Address address;
    
    @Column(name = "address_type") // 'present' or 'permanent'
    private String addressType;
    
    @Column(name = "landmark")
    private String landmark;
    
    // Getters, setters
}
```

**Validation Criteria:**
- [ ] Can retrieve devotee with all addresses
- [ ] Can retrieve namahatta with address and landmark
- [ ] Junction table relationships work correctly
- [ ] Address filtering by district works for supervisors

---

### Task 2.3: Create Repository Interfaces
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create `UserRepository.java` with authentication queries
- [ ] Create `DevoteeRepository.java` with filtering methods
- [ ] Create `NamahattaRepository.java` with district filtering
- [ ] Create `AddressRepository.java` for geographic queries
- [ ] Test all repository methods with existing data

**Key Repository: DevoteeRepository.java**
```java
@Repository
public interface DevoteeRepository extends JpaRepository<Devotee, Long> {
    
    // Find devotees by namahatta
    List<Devotee> findByNamahattaId(Long namahattaId);
    
    // Count devotees by status
    @Query("SELECT COUNT(d) FROM Devotee d WHERE d.devotionalStatus.id = :statusId")
    long countByDevotionalStatusId(@Param("statusId") Long statusId);
    
    // Complex filtering query for district supervisors
    @Query("SELECT DISTINCT d FROM Devotee d " +
           "LEFT JOIN d.addresses da " +
           "LEFT JOIN da.address a " +
           "WHERE (:allowedDistricts IS NULL OR a.districtNameEnglish IN :allowedDistricts) " +
           "AND (:status IS NULL OR d.devotionalStatus.name = :status) " +
           "AND (:search IS NULL OR " +
           "     LOWER(d.legalName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(d.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(d.phone) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Devotee> findFilteredDevotees(
        @Param("allowedDistricts") List<String> allowedDistricts,
        @Param("status") String status,
        @Param("search") String search,
        Pageable pageable
    );
}
```

**Key Repository: NamahattaRepository.java**
```java
@Repository  
public interface NamahattaRepository extends JpaRepository<Namahatta, Long> {
    
    // Check if code exists (for uniqueness validation)
    boolean existsByCode(String code);
    
    // Complex filtering for district supervisors
    @Query("SELECT DISTINCT n FROM Namahatta n " +
           "LEFT JOIN n.addresses na " +
           "LEFT JOIN na.address a " +
           "WHERE (:allowedDistricts IS NULL OR a.districtNameEnglish IN :allowedDistricts) " +
           "AND (:status IS NULL OR n.status = :status) " +
           "AND (:search IS NULL OR " +
           "     LOWER(n.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(n.code) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Namahatta> findFilteredNamahattas(
        @Param("allowedDistricts") List<String> allowedDistricts,
        @Param("status") String status,
        @Param("search") String search,
        Pageable pageable
    );
    
    // Get namahattas with devotee count
    @Query("SELECT n, COUNT(d) as devoteeCount FROM Namahatta n " +
           "LEFT JOIN n.devotees d " +
           "WHERE n.id = :id " +
           "GROUP BY n")
    Optional<Object[]> findByIdWithDevoteeCount(@Param("id") Long id);
}
```

**Validation Criteria:**
- [ ] All repository methods compile and work
- [ ] Can query existing data successfully
- [ ] Filtering by districts works for supervisors
- [ ] Pagination and sorting work correctly
- [ ] Complex joins return expected results

---

## Phase 3: Security & Authentication System

### Task 3.1: Spring Security Configuration
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Purpose**: Implement JWT-based authentication with HTTP-only cookies matching current Node.js system

**Sub-tasks:**
- [ ] Create `SecurityConfig.java` with authentication rules
- [ ] Create `JwtAuthenticationFilter.java` for token validation
- [ ] Create `JwtTokenProvider.java` for token creation/validation
- [ ] Create `UserDetailsServiceImpl.java` for user loading
- [ ] Test authentication flow with existing users

**Security Configuration:**

**Key Entity Examples:**
```java
@Entity
@Table(name = "devotees")
public class Devotee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "legal_name", nullable = false)
    private String legalName;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "devotional_status_id")
    private DevotionalStatus devotionalStatus;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "namahatta_id")
    private Namahatta namahatta;
    
    @OneToMany(mappedBy = "devotee", cascade = CascadeType.ALL)
    private List<DevoteeAddress> addresses;
    
    // ... other fields, getters, setters
}

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Enumerated(EnumType.STRING)
    private UserRole role; // ADMIN, OFFICE, DISTRICT_SUPERVISOR
    
    @ManyToMany
    @JoinTable(name = "user_districts",
               joinColumns = @JoinColumn(name = "user_id"),
               inverseJoinColumns = @JoinColumn(name = "district_code"))
    private Set<District> districts;
    
    // ... other fields
}
```

#### 2.2 Repository Layer
Create Spring Data JPA repositories with custom queries:

```java
@Repository
public interface DevoteeRepository extends JpaRepository<Devotee, Long> {
    
    @Query("SELECT d FROM Devotee d JOIN d.addresses da JOIN da.address a " +
           "WHERE (:district IS NULL OR a.districtNameEnglish IN :allowedDistricts)")
    Page<Devotee> findFilteredDevotees(
        @Param("allowedDistricts") List<String> allowedDistricts,
        Pageable pageable
    );
    
    List<Devotee> findByNamahattaId(Long namahattaId);
    
    @Query("SELECT COUNT(d) FROM Devotee d WHERE d.devotionalStatus.id = :statusId")
    long countByStatusId(Long statusId);
}
```



`SecurityConfig.java`:
```java
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    
    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
            .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthenticationEntryPoint))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints (same as Node.js)
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/health", "/api/about").permitAll()
                .requestMatchers("/api/countries", "/api/states", "/api/districts").permitAll()
                .requestMatchers("/api/sub-districts", "/api/villages", "/api/pincodes/**").permitAll()
                .requestMatchers("/api/address-by-pincode").permitAll()
                
                // Protected endpoints with role-based access
                .requestMatchers(HttpMethod.GET, "/api/devotees/**").hasAnyRole("ADMIN", "OFFICE", "DISTRICT_SUPERVISOR")
                .requestMatchers(HttpMethod.POST, "/api/devotees/**").hasAnyRole("ADMIN", "OFFICE")
                .requestMatchers(HttpMethod.PUT, "/api/devotees/**").hasAnyRole("ADMIN", "OFFICE")
                .requestMatchers(HttpMethod.DELETE, "/api/devotees/**").hasRole("ADMIN")
                
                .requestMatchers(HttpMethod.GET, "/api/namahattas/**").hasAnyRole("ADMIN", "OFFICE", "DISTRICT_SUPERVISOR")
                .requestMatchers(HttpMethod.POST, "/api/namahattas/**").hasAnyRole("ADMIN", "OFFICE")
                .requestMatchers(HttpMethod.PUT, "/api/namahattas/**").hasAnyRole("ADMIN", "OFFICE")
                .requestMatchers(HttpMethod.DELETE, "/api/namahattas/**").hasRole("ADMIN")
                
                .requestMatchers("/api/dashboard/**").hasAnyRole("ADMIN", "OFFICE", "DISTRICT_SUPERVISOR")
                .requestMatchers("/api/hierarchy/**").hasAnyRole("ADMIN", "OFFICE", "DISTRICT_SUPERVISOR")
                .requestMatchers("/api/status-distribution/**").hasAnyRole("ADMIN", "OFFICE", "DISTRICT_SUPERVISOR")
                
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12); // Same rounds as Node.js
    }
    
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}
```

**JWT Token Provider:**

`JwtTokenProvider.java`:
```java
@Component
public class JwtTokenProvider {
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Value("${jwt.expiration}")
    private long jwtExpirationMs;
    
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    
    public String createToken(User user, String sessionToken) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);
        
        // Extract district codes for the user
        List<String> districtCodes = user.getDistricts().stream()
            .map(district -> district.getCode())
            .collect(Collectors.toList());
        
        return Jwts.builder()
            .setSubject(user.getUsername())
            .claim("userId", user.getId())
            .claim("role", user.getRole().name())
            .claim("sessionToken", sessionToken)
            .claim("districts", districtCodes)
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(SignatureAlgorithm.HS512, jwtSecret)
            .compact();
    }
    
    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
            .setSigningKey(jwtSecret)
            .parseClaimsJws(token)
            .getBody();
        return claims.getSubject();
    }
    
    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token);
            return true;
        } catch (SignatureException ex) {
            logger.error("Invalid JWT signature");
        } catch (MalformedJwtException ex) {
            logger.error("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            logger.error("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            logger.error("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            logger.error("JWT claims string is empty");
        }
        return false;
    }
    
    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
            .setSigningKey(jwtSecret)
            .parseClaimsJws(token)
            .getBody();
    }
}
```

**JWT Authentication Filter:**

`JwtAuthenticationFilter.java`:
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    @Autowired
    private UserDetailsService userDetailsService;
    
    @Autowired
    private SessionService sessionService;
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        String token = getTokenFromRequest(request);
        
        if (token != null && tokenProvider.validateToken(token)) {
            try {
                Claims claims = tokenProvider.getClaimsFromToken(token);
                String username = claims.getSubject();
                String sessionToken = claims.get("sessionToken", String.class);
                
                // Validate session (same as Node.js - single login enforcement)
                if (sessionService.isSessionValid(username, sessionToken)) {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    
                    if (userDetails != null) {
                        UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        
                        // Add user info to request for controllers
                        request.setAttribute("currentUser", userDetails);
                        request.setAttribute("userId", claims.get("userId", Long.class));
                        request.setAttribute("userRole", claims.get("role", String.class));
                        request.setAttribute("userDistricts", claims.get("districts", List.class));
                    }
                }
            } catch (Exception e) {
                logger.error("Could not set user authentication in security context", e);
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getTokenFromRequest(HttpServletRequest request) {
        // Check HTTP-only cookie first (same as Node.js)
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("auth_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        
        // Fallback to Authorization header
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        
        return null;
    }
}
```

**Validation Criteria:**
- [ ] JWT tokens created with same format as Node.js
- [ ] HTTP-only cookies work for authentication
- [ ] Session validation enforces single login
- [ ] Role-based access control works correctly
- [ ] District-based filtering applied for supervisors

---

### Task 3.2: User Authentication Service
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create `AuthService.java` for login/logout logic
- [ ] Create `SessionService.java` for session management
- [ ] Create `UserDetailsServiceImpl.java` for Spring Security
- [ ] Implement password validation with BCrypt
- [ ] Test with existing users (admin, office1, supervisor1)

**Authentication Service:**

`AuthService.java`:
```java
@Service
@Transactional
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SessionService sessionService;
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    public LoginResponse authenticate(LoginRequest request) {
        // Find user (same logic as Node.js)
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        
        // Check if user is active
        if (!user.getIsActive()) {
            throw new BadCredentialsException("User account is disabled");
        }
        
        // Validate password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        
        // Create session (enforces single login)
        String sessionToken = sessionService.createSession(user);
        
        // Generate JWT token
        String jwtToken = tokenProvider.createToken(user, sessionToken);
        
        // Prepare response
        UserDto userDto = UserDto.builder()
            .id(user.getId())
            .username(user.getUsername())
            .role(user.getRole().name())
            .districts(user.getDistricts().stream()
                .map(d -> new DistrictDto(d.getCode(), d.getDistrictNameEnglish()))
                .collect(Collectors.toList()))
            .build();
        
        return LoginResponse.builder()
            .token(jwtToken)
            .user(userDto)
            .build();
    }
    
    public void logout(String username, String sessionToken) {
        // Invalidate session
        sessionService.invalidateSession(username, sessionToken);
        
        // Add token to blacklist (same as Node.js)
        // Implementation similar to current JWT blacklist table
    }
}
```

**Validation Criteria:**
- [ ] Can authenticate with existing users
- [ ] Password validation works with BCrypt
- [ ] Session management enforces single login
- [ ] Logout invalidates sessions and tokens
- [ ] District information included for supervisors

---

## Phase 4: Service Layer Implementation

### Task 4.1: Core Business Services
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create `DevoteeService.java` with all CRUD operations
- [ ] Create `NamahattaService.java` with filtering logic
- [ ] Create `GeographicService.java` for location data
- [ ] Create `DashboardService.java` for statistics
- [ ] Implement district-based filtering for supervisors

**Devotee Service:**

`DevoteeService.java`:
```java
@Service
@Transactional
public class DevoteeService {
    
    @Autowired
    private DevoteeRepository devoteeRepository;
    
    @Autowired
    private AddressService addressService;
    
    @Autowired
    private NamahattaRepository namahattaRepository;
    
    @Autowired
    private DevotionalStatusRepository statusRepository;
    
    public Page<DevoteeDto> getFilteredDevotees(
            List<String> allowedDistricts,
            String status,
            String search,
            String sortBy,
            String sortOrder,
            int page,
            int size) {
        
        // Create pageable with sorting (same logic as Node.js)
        Sort.Direction direction = "desc".equalsIgnoreCase(sortOrder) ? 
            Sort.Direction.DESC : Sort.Direction.ASC;
        
        String sortField = "name".equals(sortBy) ? "legalName" : 
                          "createdAt".equals(sortBy) ? "createdAt" : "legalName";
        
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(direction, sortField));
        
        // Apply district-based filtering for supervisors
        Page<Devotee> devotees = devoteeRepository.findFilteredDevotees(
            allowedDistricts, status, search, pageable);
        
        // Convert to DTOs with address information
        return devotees.map(this::convertToDto);
    }
    
    public List<DevoteeDto> getDevoteesByNamahatta(Long namahattaId, List<String> allowedDistricts) {
        List<Devotee> devotees = devoteeRepository.findByNamahattaId(namahattaId);
        
        // Filter by allowed districts for supervisors
        if (allowedDistricts != null && !allowedDistricts.isEmpty()) {
            devotees = devotees.stream()
                .filter(d -> hasAccessToDevotee(d, allowedDistricts))
                .collect(Collectors.toList());
        }
        
        return devotees.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }
    
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICE')")
    public DevoteeDto createDevotee(CreateDevoteeDto dto) {
        // Validate namahatta exists and user has access
        if (dto.getNamahattaId() != null) {
            Namahatta namahatta = namahattaRepository.findById(dto.getNamahattaId())
                .orElseThrow(() -> new EntityNotFoundException("Namahatta not found"));
        }
        
        // Create devotee entity
        Devotee devotee = new Devotee();
        devotee.setLegalName(dto.getLegalName());
        devotee.setName(dto.getName());
        devotee.setDob(dto.getDob());
        devotee.setEmail(dto.getEmail());
        devotee.setPhone(dto.getPhone());
        // ... set all other fields
        
        // Handle devotional status
        if (dto.getDevotionalStatusId() != null) {
            DevotionalStatus status = statusRepository.findById(dto.getDevotionalStatusId())
                .orElseThrow(() -> new EntityNotFoundException("Devotional status not found"));
            devotee.setDevotionalStatus(status);
        }
        
        // Save devotee first
        devotee = devoteeRepository.save(devotee);
        
        // Handle addresses (present and permanent)
        if (dto.getPresentAddress() != null) {
            addressService.createDevoteeAddress(devotee, dto.getPresentAddress(), "present");
        }
        
        if (dto.getPermanentAddress() != null) {
            addressService.createDevoteeAddress(devotee, dto.getPermanentAddress(), "permanent");
        }
        
        return convertToDto(devotee);
    }
    
    private DevoteeDto convertToDto(Devotee devotee) {
        // Convert entity to DTO with all address information
        // Same structure as current Node.js API response
        return DevoteeDto.builder()
            .id(devotee.getId())
            .legalName(devotee.getLegalName())
            .name(devotee.getName())
            .dob(devotee.getDob())
            .email(devotee.getEmail())
            .phone(devotee.getPhone())
            // ... all other fields
            .addresses(devotee.getAddresses().stream()
                .map(this::convertAddressToDto)
                .collect(Collectors.toList()))
            .build();
    }
}
```

**Geographic Service:**

`GeographicService.java`:
```java
@Service
public class GeographicService {
    
    @Autowired
    private AddressRepository addressRepository;
    
    public List<String> getCountries() {
        return addressRepository.findDistinctCountries();
    }
    
    public List<String> getStatesByCountry(String country) {
        if (country == null || country.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return addressRepository.findDistinctStatesByCountry(country);
    }
    
    public List<String> getDistrictsByState(String country, String state) {
        if (state == null || state.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return addressRepository.findDistinctDistrictsByState(country, state);
    }
    
    public List<String> getSubDistrictsByDistrict(String country, String state, String district, String pincode) {
        // Same logic as Node.js - filter by pincode if provided
        if (pincode != null && !pincode.trim().isEmpty()) {
            return addressRepository.findDistinctSubDistrictsByPincode(pincode);
        }
        
        if (district == null || district.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return addressRepository.findDistinctSubDistrictsByDistrict(country, state, district);
    }
    
    public List<String> getVillagesBySubDistrict(String country, String state, String district, 
                                                String subDistrict, String pincode) {
        // Same logic as Node.js - filter by both subDistrict AND pincode when both provided
        if (subDistrict != null && !subDistrict.trim().isEmpty() && 
            pincode != null && !pincode.trim().isEmpty()) {
            return addressRepository.findDistinctVillagesBySubDistrictAndPincode(subDistrict, pincode);
        }
        
        if (subDistrict == null || subDistrict.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return addressRepository.findDistinctVillagesBySubDistrict(country, state, district, subDistrict);
    }
    
    public PincodeSearchResponse searchPincodes(String country, String searchTerm, int page, int limit) {
        // Same logic as Node.js storage-db.ts
        Pageable pageable = PageRequest.of(page - 1, limit);
        
        Page<String> pincodes;
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            pincodes = addressRepository.findDistinctPincodesByCountryAndSearch(country, searchTerm, pageable);
        } else {
            pincodes = addressRepository.findDistinctPincodesByCountry(country, pageable);
        }
        
        return PincodeSearchResponse.builder()
            .pincodes(pincodes.getContent())
            .total((int) pincodes.getTotalElements())
            .hasMore(pincodes.hasNext())
            .build();
    }
    
    public AddressInfoDto getAddressByPincode(String pincode) {
        // Same logic as Node.js - get first address with this pincode
        Optional<Address> address = addressRepository.findFirstByPincode(pincode);
        
        if (address.isPresent()) {
            Address addr = address.get();
            return AddressInfoDto.builder()
                .country(addr.getCountry())
                .state(addr.getStateNameEnglish())
                .district(addr.getDistrictNameEnglish())
                .build();
        }
        
        return null;
    }
}
```

**Validation Criteria:**
- [ ] All geographic endpoints return same data as Node.js
- [ ] Pincode search works with pagination
- [ ] Address lookup by pincode works correctly
- [ ] Sub-district/village filtering by pincode works
- [ ] Empty parameters handled gracefully

---

## Phase 5: REST Controllers & API Layer

### Task 5.1: Authentication Controller
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Purpose**: Convert all `/api/auth/*` endpoints from Express to Spring Boot

**Sub-tasks:**
- [ ] Create `AuthController.java` with login/logout endpoints
- [ ] Implement HTTP-only cookie handling
- [ ] Create user verification endpoint
- [ ] Add development endpoints for user testing
- [ ] Test authentication flow end-to-end

`AuthController.java`:
```java
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(credentials = true)
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        
        try {
            LoginResponse loginResponse = authService.authenticate(request);
            
            // Set HTTP-only cookie (same as Node.js)
            Cookie cookie = new Cookie("auth_token", loginResponse.getToken());
            cookie.setHttpOnly(true);
            cookie.setSecure(false); // Set to true in production
            cookie.setPath("/");
            cookie.setMaxAge(86400); // 24 hours
            response.addCookie(cookie);
            
            return ResponseEntity.ok(loginResponse);
            
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(LoginResponse.builder()
                    .error("Invalid credentials")
                    .build());
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        
        try {
            // Get user info from JWT token
            String token = getTokenFromRequest(request);
            if (token != null) {
                Claims claims = jwtTokenProvider.getClaimsFromToken(token);
                String username = claims.getSubject();
                String sessionToken = claims.get("sessionToken", String.class);
                
                // Logout user (invalidate session)
                authService.logout(username, sessionToken);
            }
            
            // Clear HTTP-only cookie
            Cookie cookie = new Cookie("auth_token", "");
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge(0);
            response.addCookie(cookie);
            
            Map<String, String> result = new HashMap<>();
            result.put("message", "Logged out successfully");
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Logout failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyToken(HttpServletRequest request) {
        
        try {
            String token = getTokenFromRequest(request);
            
            if (token == null || !jwtTokenProvider.validateToken(token)) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Session expired");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            
            Claims claims = jwtTokenProvider.getClaimsFromToken(token);
            String username = claims.getSubject();
            String sessionToken = claims.get("sessionToken", String.class);
            
            // Validate session
            if (!sessionService.isSessionValid(username, sessionToken)) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Session expired");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            
            // Return user info (same format as Node.js)
            Map<String, Object> result = new HashMap<>();
            Map<String, Object> user = new HashMap<>();
            user.put("id", claims.get("userId", Long.class));
            user.put("username", username);
            user.put("role", claims.get("role", String.class));
            user.put("districts", claims.get("districts", List.class));
            
            result.put("user", user);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Session expired");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }
    
    // Development endpoint to check users (same as Node.js)
    @GetMapping("/dev/users")
    public ResponseEntity<Map<String, Object>> getDevUsers() {
        if (!"development".equals(environment)) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> users = authService.getDevUsers();
        return ResponseEntity.ok(users);
    }
    
    private String getTokenFromRequest(HttpServletRequest request) {
        // Same logic as JWT filter
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("auth_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
```

**Validation Criteria:**
- [ ] Login works with existing users (admin, office1, supervisor1)
- [ ] HTTP-only cookies set correctly
- [ ] Logout clears cookies and invalidates sessions
- [ ] Token verification returns correct user info
- [ ] Development endpoints work in dev mode only

---

### Task 5.2: Devotee Controller
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create `DevoteeController.java` with all CRUD endpoints
- [ ] Implement filtering, sorting, and pagination
- [ ] Add district-based access control
- [ ] Create devotee-specific endpoints for namahattas
- [ ] Test all endpoints with existing data

`DevoteeController.java`:
```java
@RestController
@RequestMapping("/api/devotees")
@Validated
public class DevoteeController {
    
    @Autowired
    private DevoteeService devoteeService;
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> getDevotees(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortOrder,
            HttpServletRequest request) {
        
        // Get user districts from JWT token
        List<String> allowedDistricts = (List<String>) request.getAttribute("userDistricts");
        String userRole = (String) request.getAttribute("userRole");
        
        // Apply district filtering only for supervisors
        if ("DISTRICT_SUPERVISOR".equals(userRole)) {
            // Convert district codes to district names (same logic as Node.js)
            allowedDistricts = convertDistrictCodesToNames(allowedDistricts);
        } else {
            allowedDistricts = null; // Admin and Office can see all
        }
        
        Page<DevoteeDto> devotees = devoteeService.getFilteredDevotees(
            allowedDistricts, status, search, sortBy, sortOrder, page, size);
        
        Map<String, Object> response = new HashMap<>();
        response.put("data", devotees.getContent());
        response.put("total", devotees.getTotalElements());
        response.put("page", page);
        response.put("size", size);
        response.put("totalPages", devotees.getTotalPages());
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<DevoteeDto> getDevotee(@PathVariable Long id, HttpServletRequest request) {
        
        List<String> allowedDistricts = getAllowedDistricts(request);
        DevoteeDto devotee = devoteeService.getDevoteeById(id, allowedDistricts);
        
        if (devotee == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(devotee);
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICE')")
    public ResponseEntity<DevoteeDto> createDevotee(@Valid @RequestBody CreateDevoteeDto dto) {
        
        DevoteeDto createdDevotee = devoteeService.createDevotee(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdDevotee);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICE')")
    public ResponseEntity<DevoteeDto> updateDevotee(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDevoteeDto dto,
            HttpServletRequest request) {
        
        List<String> allowedDistricts = getAllowedDistricts(request);
        DevoteeDto updatedDevotee = devoteeService.updateDevotee(id, dto, allowedDistricts);
        
        return ResponseEntity.ok(updatedDevotee);
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteDevotee(@PathVariable Long id) {
        
        devoteeService.deleteDevotee(id);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Devotee deleted successfully");
        return ResponseEntity.ok(response);
    }
    
    private List<String> getAllowedDistricts(HttpServletRequest request) {
        String userRole = (String) request.getAttribute("userRole");
        
        if ("DISTRICT_SUPERVISOR".equals(userRole)) {
            List<String> districtCodes = (List<String>) request.getAttribute("userDistricts");
            return convertDistrictCodesToNames(districtCodes);
        }
        
        return null; // Admin and Office can access all
    }
}
```

**Validation Criteria:**
- [ ] All CRUD operations work correctly
- [ ] District filtering works for supervisors
- [ ] Pagination and sorting match Node.js behavior
- [ ] Role-based access control enforced
- [ ] Response format matches current API exactly

---

### Task 5.3: Namahatta Controller
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create `NamahattaController.java` with all endpoints
- [ ] Implement namahatta-specific devotee endpoints
- [ ] Add address update functionality
- [ ] Create update management endpoints
- [ ] Test with existing namahatta data

**Validation Criteria:**
- [ ] All namahatta endpoints work correctly
- [ ] Address updates work properly
- [ ] Devotee assignment/management works
- [ ] District filtering applied for supervisors
- [ ] Response format matches Node.js API

---

### Task 5.4: Geographic & Dashboard Controllers
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create `GeographicController.java` for location endpoints
- [ ] Create `DashboardController.java` for statistics
- [ ] Create `StatusController.java` for devotional statuses
- [ ] Create `HierarchyController.java` for leadership
- [ ] Test all public and protected endpoints

**Validation Criteria:**
- [ ] All geographic endpoints return correct data
- [ ] Dashboard statistics match Node.js calculations
- [ ] Status distribution works correctly
- [ ] Leadership hierarchy displays properly
- [ ] Public endpoints accessible without authentication

---

## Phase 6: Testing & Validation

### Task 6.1: Unit Testing
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Write tests for all service classes
- [ ] Write tests for repository methods
- [ ] Write tests for authentication logic
- [ ] Write tests for geographic services
- [ ] Achieve 80%+ code coverage

### Task 6.2: Integration Testing
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Test all REST endpoints with TestRestTemplate
- [ ] Test authentication flows end-to-end
- [ ] Test district-based filtering for supervisors
- [ ] Test address CRUD operations
- [ ] Compare API responses with Node.js version

### Task 6.3: Performance Testing
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Load test with existing data volume
- [ ] Compare response times with Node.js
- [ ] Test database connection pooling
- [ ] Optimize slow queries
- [ ] Validate memory usage

---

## Phase 7: Deployment & Migration

### Task 7.1: Production Configuration
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Create production application.yml
- [ ] Configure environment variables
- [ ] Set up logging configuration
- [ ] Configure SSL and security headers
- [ ] Test with production database

### Task 7.2: Replit Deployment Setup
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Configure Replit deployment settings
- [ ] Set up environment variables in Replit Secrets
- [ ] Test deployment process
- [ ] Configure auto-scaling if needed
- [ ] Set up monitoring and health checks

### Task 7.3: Migration Execution
**Status**: ☐ Not Started | ☐ In Progress | ☐ Completed

**Sub-tasks:**
- [ ] Run final comparison tests
- [ ] Switch frontend API calls to Spring Boot
- [ ] Monitor system performance
- [ ] Verify all functionality works
- [ ] Keep Node.js version as backup

---

## Timeline Summary

### Week 1: Foundation (Tasks 1.1 - 2.3)
- **Days 1-2**: Project setup, database connection, entity mapping
- **Days 3-4**: Repository layer, basic queries, relationship testing
- **Days 5-7**: Security configuration, JWT implementation, authentication

### Week 2: Core Implementation (Tasks 3.1 - 4.1)
- **Days 8-9**: Complete authentication system, session management
- **Days 10-11**: Business services, district filtering, CRUD operations
- **Days 12-14**: REST controllers, endpoint implementation, API testing

### Week 3: Completion & Migration (Tasks 5.1 - 7.3)
- **Days 15-16**: Geographic services, dashboard, remaining endpoints
- **Days 17-18**: Comprehensive testing, performance optimization
- **Days 19-21**: Production deployment, migration execution, monitoring

## Success Criteria Checklist

### Functional Requirements
- [ ] All 25+ API endpoints work identically to Node.js version
- [ ] JWT authentication with HTTP-only cookies functional
- [ ] Role-based access control (ADMIN, OFFICE, DISTRICT_SUPERVISOR) working
- [ ] District-based data filtering for supervisors implemented
- [ ] Geographic data hierarchy and filtering operational
- [ ] Pagination, sorting, search functionality preserved
- [ ] Address CRUD operations with landmark handling working
- [ ] Session management with single login enforcement active

### Technical Requirements
- [ ] Spring Boot application starts successfully on port 5000
- [ ] Connects to existing PostgreSQL database without schema changes
- [ ] Maven builds and runs in Replit environment
- [ ] Response times within 10% of Node.js version
- [ ] Memory usage optimized
- [ ] Error handling matches Node.js behavior
- [ ] Logging configuration appropriate for debugging

### Security Requirements
- [ ] Password validation with BCrypt working
- [ ] JWT token validation identical to Node.js
- [ ] Session invalidation and token blacklisting functional
- [ ] CORS configuration appropriate for frontend
- [ ] SQL injection protection via JPA parameterized queries
- [ ] Input validation on all endpoints

This comprehensive migration plan provides granular, checklistable tasks that can be tracked as "Not Started", "In Progress", or "Completed", making the migration process manageable and transparent.
```

### Phase 6: Configuration & Properties (Day 7)

#### 6.1 Application Configuration
```yaml
# application.yml
spring:
  application:
    name: namahatta-management-system
  
  datasource:
    url: ${DATABASE_URL}
    driver-class-name: org.postgresql.Driver
    
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        
  flyway:
    enabled: true
    locations: classpath:db/migration

jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000 # 24 hours

session:
  secret: ${SESSION_SECRET}
  
server:
  port: ${PORT:5000}
  
logging:
  level:
    com.namahatta: DEBUG
    org.springframework.security: DEBUG
```

### Phase 7: Testing & Validation (Day 8-9)

#### 7.1 Unit Tests
```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class DevoteeServiceTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("namahatta_test")
            .withUsername("test")
            .withPassword("test");
    
    @Test
    void shouldCreateDevoteeWithAddress() {
        // Test devotee creation
    }
    
    @Test
    void shouldFilterDevoteesByDistrict() {
        // Test district-based filtering
    }
}
```

#### 7.2 Integration Tests
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AuthControllerIntegrationTest {
    
    @Test
    void shouldAuthenticateUserAndSetCookie() {
        // Test complete authentication flow
    }
}
```

### Phase 8: Deployment Configuration (Day 9-10)

#### 8.1 Docker Configuration
```dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app
COPY target/namahatta-management-system-1.0.jar app.jar

EXPOSE 5000
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### 8.2 Replit Configuration
```bash
# .replit
run = "mvn spring-boot:run"
entrypoint = "src/main/java/com/namahatta/NamahattaApplication.java"

[languages.java]
pattern = "**/*.java"

[nix]
channel = "stable-22_11"

[deployment]
run = ["mvn", "clean", "package", "-DskipTests", "&&", "java", "-jar", "target/namahatta-management-system-1.0.jar"]
```

## Migration Execution Plan

### Week 1: Core Migration
- **Day 1-2**: Project setup, dependencies, basic configuration
- **Day 3-4**: Entity mapping, repository layer
- **Day 5-6**: Security configuration, JWT implementation
- **Day 7**: Service layer for core entities (Devotee, Namahatta)

### Week 2: Feature Completion
- **Day 8-9**: Complete all service implementations
- **Day 10-11**: REST controller implementation
- **Day 12-13**: Authentication system, role-based access
- **Day 14**: Testing, validation, bug fixes

### Week 3: Advanced Features & Deployment
- **Day 15-16**: Geographic services, dashboard APIs
- **Day 17-18**: Complete testing suite
- **Day 19-20**: Performance optimization, caching
- **Day 21**: Production deployment configuration

## Key Migration Considerations

### 1. Database Compatibility
- Keep existing PostgreSQL schema unchanged
- Use Flyway for any necessary schema updates
- Maintain all foreign key relationships

### 2. API Compatibility
- Maintain exact same REST endpoints
- Keep identical request/response formats
- Preserve authentication flow with HTTP-only cookies

### 3. Authentication Migration
- Port JWT implementation exactly
- Maintain session-based single login enforcement
- Keep role-based access control logic

### 4. Data Access Patterns
- Implement same filtering logic for district supervisors
- Maintain pagination, sorting, search functionality
- Keep geographic data hierarchy intact

### 5. Performance Considerations
- Implement JPA query optimization
- Add appropriate database indexes
- Consider caching for geographic data

## Risk Mitigation

### 1. Parallel Development
- Keep Node.js version running during migration
- Use feature flags for gradual rollout
- Maintain database schema compatibility

### 2. Testing Strategy
- Comprehensive unit test coverage
- Integration tests for all endpoints
- Load testing with existing data volume

### 3. Rollback Plan
- Database backup before migration
- Keep Node.js deployment ready
- Environment-based routing for gradual migration

### 4. Data Validation
- Compare API responses between versions
- Validate authentication flows
- Test all role-based access scenarios

## Success Criteria

### Functional Requirements
- ✅ All 25+ API endpoints working identically
- ✅ Authentication system with HTTP-only cookies
- ✅ Role-based access control (ADMIN, OFFICE, DISTRICT_SUPERVISOR)
- ✅ District-based data filtering for supervisors
- ✅ Geographic data hierarchy intact
- ✅ Pagination, sorting, search functionality

### Performance Requirements
- Response times within 10% of current system
- Support for current user load (concurrent sessions)
- Database query optimization maintained

### Security Requirements
- JWT token validation identical
- Password hashing compatibility
- Session management with single login enforcement
- Token blacklisting for secure logout

## Tools & Libraries Required

### Core Dependencies
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.1.0</version>
    </dependency>
</dependencies>
```

This comprehensive plan provides a structured approach to migrating your Namahatta Management System to Spring Boot while maintaining all existing functionality and ensuring a smooth transition.