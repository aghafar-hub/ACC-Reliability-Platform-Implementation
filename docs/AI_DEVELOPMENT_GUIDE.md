\# AI\_DEVELOPMENT\_GUIDE.md



\# ACC Reliability Platform



\## AI Development Guide



Version: 1.0



Status: Active



\---



\# PURPOSE



This document defines the permanent engineering rules for any AI assistant contributing to the ACC Reliability Platform.



Every AI agent shall read this document before modifying source code.



The objective is to ensure consistent architecture, coding quality, maintainability, and long-term scalability.



\---



\# PROJECT PHILOSOPHY



This is \*\*not\*\* a normal web application.



It is an enterprise engineering platform expected to operate for more than 10 years.



The implementation must prioritize:



\* Maintainability

\* Reliability

\* Scalability

\* Performance

\* Readability

\* Extensibility



Short-term shortcuts are prohibited.



\---



\# ARCHITECTURE



The architecture repository is the source of truth.



Implementation shall never contradict the approved architecture.



If implementation conflicts with architecture:



Stop.



Report the conflict.



Do not invent a solution.



\---



\# DEVELOPMENT PRINCIPLES



Always prefer:



\* Clean Architecture

\* SOLID principles

\* Strong typing

\* Small focused classes

\* Dependency Injection

\* Composition over inheritance



Avoid unnecessary complexity.



\---



\# PROJECT STRUCTURE



The repository follows this structure:



platform/



\* kernel

\* services

\* sdk

\* storage

\* shared-types

\* shared-ui



modules/



\* oil-lubrication

\* oil-analysis

\* vibration-analysis

\* reliability-measurements

\* compressors



apps/



\* owner-center

\* contractor-portal

\* mobile



Business logic belongs only inside modules.



Platform logic belongs only inside platform.



\---



\# PLATFORM FIRST



Never duplicate platform functionality inside business modules.



Business modules shall consume:



\* Platform SDK

\* Platform Services

\* Storage Abstraction



\---



\# MODULE INDEPENDENCE



Every module must remain independently deployable.



Business modules shall never directly depend on another business module.



Shared functionality belongs inside Platform Services.



\---



\# MODULE COMMUNICATION



Direct module-to-module communication is prohibited.



Current implementation shall communicate through approved Platform Services.



Future versions will introduce an Event Bus.



Prepare code for future event-driven architecture but do not implement it yet.



\---



\# STORAGE



Business modules shall never communicate directly with Google Sheets.



All storage access shall pass through the Storage Abstraction layer.



Future SQL migration shall not require module rewrites.



\---



\# EQUIPMENT IDENTIFIER



Equipment\_ID is the master equipment identifier across the entire platform.



Never introduce alternative equipment keys.



\---



\# CONTRACTOR ISOLATION



The platform must always support contractor isolation.



Current contractors:



\* ACC

\* RHI

\* ASEC



Future contractors shall be supported without redesign.



\---



\# PERFORMANCE



Always prefer:



\* Lazy loading

\* Batch operations

\* Caching

\* Small bundles

\* Minimal API calls



Avoid loading unnecessary data.



\---



\# TYPESCRIPT



Requirements:



\* Strict mode

\* No implicit any

\* Strong interfaces

\* Meaningful names

\* Small files



Avoid disabling compiler checks.



\---



\# ERROR HANDLING



Never swallow exceptions.



Create meaningful error types.



Include context.



Provide useful log messages.



\---



\# LOGGING



Every significant operation shall support logging.



Logs should include:



\* Timestamp

\* Level

\* Correlation ID (where available)

\* Context



\---



\# SECURITY



Never hardcode:



\* Passwords

\* Secrets

\* API keys

\* Tokens



Authentication and authorization belong to Platform Services.



\---



\# USER INTERFACE



Keep UI separate from business logic.



Business rules shall never exist inside React components.



\---



\# IMPLEMENTATION PROCESS



Each milestone shall:



1\. Implement one capability.

2\. Compile successfully.

3\. Pass type checking.

4\. Be reviewed.

5\. Be committed.



Do not mix unrelated work.



\---



\# AI RESPONSE RULES



When completing a milestone:



Return only:



\* Summary

\* Files created

\* Files modified

\* Commands to run

\* Manual testing steps

\* Assumptions



Do not print entire source files unless requested.



Modify files directly whenever possible.



\---



\# WHEN UNSURE



Do not guess.



Ask for clarification.



Never silently change architecture.



\---



\# LONG-TERM ROADMAP



Current priorities:



1\. Platform Kernel

2\. Platform Services

3\. Storage Abstraction

4\. Platform SDK

5\. App Owner Control Center

6\. Existing Module Migration

7\. Event Bus

8\. AI Integration

9\. External Integrations

10\. SQL Migration



\---



\# GOLDEN RULE



Build software that another engineer can understand, maintain, and extend ten years from now.



Every implementation decision shall favor long-term quality over short-term convenience.



\---



\# END OF DOCUMENT



