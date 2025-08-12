# WorkForce Compass

A comprehensive web-based assessment platform designed for HR professionals and administrators to create, manage, and analyze candidate evaluations. The system supports multi-business environments with customizable assessments, benchmark comparisons, and detailed reporting.

## Features

### Core Functionality
- **Multi-Business Support**: Manage multiple organizations with custom branding
- **Assessment Creation**: Dynamic question-pair based assessments
- **Benchmark Analysis**: Compare candidates against industry benchmarks
- **PDF Report Generation**: Automated assessment reports with charts
- **Email Integration**: Automated invitation and result notifications
- **Manager Assignment**: Multi-manager notification system with primary contacts

### User Roles
- **Admin**: Full system access, business management, global settings
- **HR Users**: Assessment creation, candidate management, report access
- **Candidates**: Secure assessment completion interface

### Business Customization
- **Custom Branding**: Logo uploads, primary color themes
- **Assessment Templates**: CSV upload for question pairs
- **Manager Hierarchies**: Regional managers with default assignments
- **Training Materials**: Centralized training resource management

## Table of Contents

1. [Configuration](#configuration)
2. [User Guide](#user-guide)
3. [Architecture](#architecture)

## Configuration
### Required Dependencies

Key packages your application uses:
- `Django` - Web framework
- `WeasyPrint` - PDF generation
- `cloudinary` - File storage
- `pandas` - Data processing
- `redis` - Caching
- `psycopg2` - PostgreSQL adapter

## User Guide

### Admin Functions

**Business Management**
- Create and manage multiple businesses
- Upload business logos and set brand colors
- Configure assessment templates via CSV upload
- Manage HR users across all businesses

**Assessment Oversight**
- View all assessments across businesses
- Generate and download reports
- Manage benchmark comparisons
- Configure email templates

**Training Materials**
- Create global training resources
- Manage document links and presentations
- Organize materials with custom icons and colors

### HR User Functions

**Assessment Creation**
1. Navigate to "Create Assessment"
2. Fill in candidate details
3. Select managers for notifications
4. System generates unique assessment link
5. Automatic email invitation sent

**Assessment Management**
- View all assessments for your business
- Resend invitations with new links
- Download PDF reports
- Track completion status and times

**Manager Configuration**
- Add regional managers
- Set default notification preferences
- Configure primary contacts

### Candidate Experience

**Taking Assessments**
1. Receive email invitation with unique link
2. Complete assessment with progress tracking
3. Submit responses (one-time use link)
4. Automatic report generation and distribution

## Architecture

### Project Structure
```
baseapp/
├── models.py           # Database models
├── views.py            # View controllers
├── forms.py            # Form definitions
├── urls.py             # URL routing
├── middleware.py       # Security middleware
├── utils/
│   └── report_generator.py  # PDF generation
├── templates/          # HTML templates
└── static/             # CSS, JS assets

admin_components/       # React admin interface
├── AdminDashboard.js
├── AssessmentSection.js
├── BenchmarkSection.js
├── HRUserManager.js
└── [other components]
```

### Database Schema

**Core Models**
- `Business`: Multi-tenant organization data
- `CustomUser`: Extended user model with business associations
- `Assessment`: Individual assessment instances
- `QuestionPair`: Assessment question definitions
- `Manager`: Business manager hierarchy
- `AssessmentResponse`: Candidate answers and scoring

### Key Features Implementation

**Security**
- Rate limiting on sensitive endpoints
- CSRF protection
- Input validation and sanitization
- Secure token generation for assessment links

**Performance**
- Redis caching for benchmark results
- Optimized database queries with prefetch_related
- Efficient PDF generation with caching

**Email System**
- Template-based email generation
- Multi-recipient manager notifications
- Automated assessment invitations

## Security Features

**Rate Limiting**
- Login attempts: 5 per minute per IP
- Password reset: 3 per 5 minutes per IP
- Assessment creation: Configurable limits

**Data Protection**
- Encrypted sensitive data storage
- Secure file upload validation
- SQL injection prevention
- XSS protection through templating

**Access Control**
- Role-based permissions (Admin, HR, Candidate)
- Business-level data isolation
- Secure assessment link generation

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## Roadmap

**Upcoming Features**
- Multi-language support
- Advanced analytics dashboard
- Integration with HRIS systems
- Mobile app for assessments
- AI-powered insights

---

**Version**: 1.0.0  
**Last Updated**: 2025  
**Maintained By**: Development Team