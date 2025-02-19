from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.core.mail import EmailMessage, send_mail, send_mass_mail, EmailMultiAlternatives
from django.conf import settings
from django.contrib import messages
from django.utils.crypto import get_random_string
from django.urls import reverse
from django.utils import timezone
from django.http import FileResponse, Http404, JsonResponse
from django.views.decorators.http import require_http_methods
from datetime import datetime
import pandas as pd
import json
import csv
from .models import Assessment, AssessmentResponse, QuestionPair, QuestionResponse, Attribute, Business, BenchmarkBatch, CustomUser
from .forms import AssessmentCreationForm, AssessmentResponseForm, BenchmarkBatchForm, PasswordResetForm, SetNewPasswordForm
from .utils.report_generator import generate_assessment_report
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
import os
from io import StringIO

#link generation
def generate_secure_token(entity_id=None, token_type='general', length=16):
    """
    Generate a secure token of specified length.
    
    Args:
        entity_id: Optional ID to encode in the token for validation
        token_type: Type of token ('reset', 'assessment', etc.) for namespacing
        length: Desired token length (default 16)
    
    Returns:
        A secure random token string
    """
    import hashlib
    import base64
    from django.utils.crypto import get_random_string
    
    # For simple cases with no ID, just return a random string
    if entity_id is None:
        return get_random_string(length)
        
    # Create a more sophisticated token when we have an ID
    # Get random part for uniqueness (using half the desired length)
    random_part = get_random_string(length // 2)
    
    # Create a hash using the entity ID, token type, and random part
    # This allows validation of tokens and prevents guessing
    salt = settings.SECRET_KEY[:16]  # Use part of the SECRET_KEY as salt
    id_string = f"{entity_id}:{token_type}:{salt}:{random_part}"
    id_hash = hashlib.sha256(id_string.encode()).digest()
    
    # Get a URL-safe base64 encoding of the hash
    encoded_id = base64.urlsafe_b64encode(id_hash).decode()
    
    # Return a token of the specified length
    return f"{random_part}{encoded_id}"[:length]

#util views
def is_admin(user):
    """Check if user is an admin"""
    return user.is_authenticated and user.is_superuser

def is_hr_user(user):
    """Check if the user has HR privileges"""
    return user.is_authenticated and user.is_hr

def check_user_type(request):
    """AJAX endpoint to check if user is superuser"""
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            return JsonResponse({
                'is_superuser': user.is_superuser
            })
    return JsonResponse({'is_superuser': False})

def redirect_user(user):
    """Helper function to redirect users based on their type"""
    if user.is_superuser:
        return redirect('baseapp:admin_dashboard')
    elif user.is_hr:
        return redirect('baseapp:dashboard')
    return redirect('baseapp:home')

def businesses_content(request):
    businesses = Business.objects.all()
    return render(request, 'partials/businesses_table.html', {'businesses': businesses})

def hr_users_content(request):
    hr_users = CustomUser.objects.all()
    return render(request, 'partials/hr_users_table.html', {'hr_users': hr_users})

def assessments_content(request):
    question_pairs = QuestionPair.objects.all()
    return render(request, 'partials/assessments_table.html', {'question_pairs': question_pairs})


#base views
def home(request):
    """Home page view - redirects to dashboard for HR users"""
    if request.user.is_authenticated:
        if request.user.is_hr:
            return redirect('baseapp:dashboard')
        elif request.user.is_superuser:
            return redirect('admin:index')
    return render(request, 'baseapp/home.html')

def login_view(request):
    """Handle user login"""
    if request.user.is_authenticated:
        return redirect_user(request.user)
            
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect_user(user)
        else:
            messages.error(request, 'Invalid username or password')
    
    return render(request, 'baseapp/login.html')

def logout_view(request):
    """Handle user logout"""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('baseapp:login')

def password_reset_view(request):
    """Handle password reset request"""
    if request.method == 'POST':
        form = PasswordResetForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            user = CustomUser.objects.get(email=email)
            
            # Generate unique reset token (16 chars is sufficient)
            reset_token = generate_secure_token(
                entity_id=user.id,
                token_type='password_reset',
                length=16
            )
            
            # Store reset token in user's session with expiry
            request.session[f'password_reset_{reset_token}'] = {
                'user_id': user.id,
                'expires': (timezone.now() + timezone.timedelta(hours=24)).isoformat()
            }
            
            # Generate reset URL
            reset_url = request.build_absolute_uri(
                reverse('baseapp:password_reset_confirm', args=[reset_token])
            )
            
            try:
                # Send reset email
                send_mail(
                    subject='Password Reset Request',
                    message=f'''You requested a password reset.

Click the following link to reset your password:
{reset_url}

This link will expire in 24 hours.

If you did not request this reset, please ignore this email.''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
                messages.success(
                    request,
                    'Password reset instructions have been sent to your email.'
                )
            except Exception as e:
                print(f"Email error: {e}")  # For debugging
                messages.error(
                    request,
                    'There was an error sending the reset email. Please try again.'
                )
            return redirect('baseapp:login')
    else:
        form = PasswordResetForm()
    
    return render(request, 'baseapp/password_reset.html', {'form': form})

def password_reset_confirm(request, token):
    """Handle password reset confirmation"""
    # Check if token exists and is valid
    session_key = f'password_reset_{token}'
    reset_data = request.session.get(session_key)
    
    if not reset_data:
        messages.error(request, 'Invalid or expired password reset link.')
        return redirect('baseapp:login')
    
    # Check if token has expired
    expires = datetime.fromisoformat(reset_data['expires'])
    if timezone.now() > expires:
        del request.session[session_key]
        messages.error(request, 'This password reset link has expired.')
        return redirect('baseapp:login')
    
    # Get user
    try:
        user = CustomUser.objects.get(id=reset_data['user_id'])
    except CustomUser.DoesNotExist:
        messages.error(request, 'Invalid user account.')
        return redirect('baseapp:login')
    
    if request.method == 'POST':
        form = SetNewPasswordForm(request.POST)
        if form.is_valid():
            # Set new password
            user.set_password(form.cleaned_data['password1'])
            user.save()
            
            # Clean up session
            del request.session[session_key]
            
            messages.success(
                request,
                'Your password has been successfully reset. Please log in with your new password.'
            )
            return redirect('baseapp:login')
    else:
        form = SetNewPasswordForm()
    
    return render(request, 'baseapp/password_reset_confirm.html', {'form': form})

def take_assessment(request, unique_link):
    """View for candidates to take their assessment"""
    import logging
    logger = logging.getLogger(__name__)
    
    assessment = get_object_or_404(Assessment, unique_link=unique_link)
    
    # Check if assessment is already completed
    if assessment.completed:
        messages.error(request, 'This assessment has already been completed.')
        return render(request, 'baseapp/assessment_closed.html')
    
    # Get all active question pairs
    question_pairs = QuestionPair.objects.filter(
        business=assessment.business,
        active=True
    ).order_by('order')
    
    if request.method == 'POST':
        form = AssessmentResponseForm(request.POST, question_pairs=question_pairs)
        if form.is_valid():
            try:
                # Create the assessment response
                assessment_response = AssessmentResponse.objects.create(
                    assessment=assessment
                )
                
                # Save individual question responses
                for pair in question_pairs:
                    field_name = f'question_{pair.id}'
                    if field_name in form.cleaned_data:
                        chose_a = form.cleaned_data[field_name] == 'A'
                        QuestionResponse.objects.create(
                            assessment_response=assessment_response,
                            question_pair=pair,
                            chose_a=chose_a
                        )
                    else:
                        messages.error(request, 'Please answer all questions before submitting.')
                        return render(request, 'baseapp/take_assessment.html', {
                            'form': form,
                            'assessment': assessment
                        })
                
                # Mark assessment as completed
                assessment.completed = True
                assessment.completed_at = timezone.now()
                assessment.save()
                
                try:
                    logger.info(f"Starting PDF generation for assessment ID: {assessment.id}")
                    # Generate PDF report
                    pdf_path = generate_assessment_report(assessment_response)
                    logger.info(f"PDF generated successfully at {pdf_path}")
                    
                    # Prepare email content
                    subject = f'Assessment Report - {assessment.candidate_name} - {assessment.position}'
                    message = f'''Dear {assessment.manager_name},

The assessment for {assessment.candidate_name} for the position of {assessment.position} has been completed.

Please find the assessment report attached to this email. 

Assessment Details:
- Candidate: {assessment.candidate_name}
- Position: {assessment.position}
- Region: {assessment.region}
- Completion Date: {timezone.now().strftime("%Y-%m-%d %H:%M")}

This is an automated message. Please do not reply to this email.

Best regards,
Assessment System'''

                    logger.info(f"Preparing to send email for assessment ID: {assessment.id} to manager: {assessment.manager_email}")
                    # Create and send email with PDF attachment
                    email = EmailMessage(
                        subject=subject,
                        body=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[assessment.manager_email],
                        reply_to=[settings.DEFAULT_FROM_EMAIL]
                    )
                    
                    # Verify PDF exists and has content
                    if os.path.exists(pdf_path):
                        logger.info(f"PDF exists at {pdf_path}, size: {os.path.getsize(pdf_path)} bytes")
                    else:
                        logger.error(f"PDF file not found at {pdf_path}")
                        raise FileNotFoundError(f"Generated PDF not found at {pdf_path}")
                    
                    # Attach the PDF with a clean filename
                    clean_name = "".join(c for c in assessment.candidate_name if c.isalnum() or c in (' ', '-', '_')).strip()
                    filename = f'Assessment_Report_{clean_name}_{timezone.now().strftime("%Y%m%d")}.pdf'
                    
                    with open(pdf_path, 'rb') as f:
                        email.attach(filename, f.read(), 'application/pdf')
                    
                    # Send the email
                    logger.info("Attempting to send email...")
                    email.send(fail_silently=False)
                    logger.info(f"Email sent successfully to {assessment.manager_email}")
                    
                    # Clean up the PDF file after sending
                    if os.path.exists(pdf_path):
                        os.remove(pdf_path)
                        logger.info(f"Cleaned up PDF file at {pdf_path}")
                    
                except ImportError as e:
                    logger.error(f"WeasyPrint import error: {str(e)}")
                    logger.error("Please check if WeasyPrint and its dependencies are installed correctly")
                    messages.error(request, 'There was an error generating the assessment report. The system administrator has been notified.')
                
                except OSError as e:
                    logger.error(f"OS error during PDF generation: {str(e)}")
                    logger.error("This might be due to file permission issues or missing system dependencies")
                    messages.error(request, 'There was an error processing the assessment report. The system administrator has been notified.')
                
                except Exception as e:
                    # Log the error with more details
                    logger.error(f"Failed to generate/send assessment report: {str(e)}")
                    logger.error(f"Assessment ID: {assessment.id}")
                    logger.error(f"Manager Email: {assessment.manager_email}")
                    logger.error(f"Email settings: FROM_EMAIL={settings.DEFAULT_FROM_EMAIL}")
                    
                    # Log email configuration for debugging
                    logger.debug(f"Email Backend: {settings.EMAIL_BACKEND}")
                    logger.debug(f"Email Host: {settings.EMAIL_HOST}")
                    logger.debug(f"Email Port: {settings.EMAIL_PORT}")
                    logger.debug(f"Email Use TLS: {settings.EMAIL_USE_TLS}")
                    
                    messages.error(request, 'There was an error sending the assessment report. The system administrator has been notified.')
                
                # Redirect to thank you page regardless of email success
                return redirect('baseapp:thank_you')
                
            except Exception as e:
                logger.error(f"Error processing assessment submission: {str(e)}")
                messages.error(
                    request,
                    'There was an error processing your submission. Please try again.'
                )
                return render(request, 'baseapp/take_assessment.html', {
                    'form': form,
                    'assessment': assessment
                })
    else:
        form = AssessmentResponseForm(question_pairs=question_pairs)
    
    return render(request, 'baseapp/take_assessment.html', {
        'form': form,
        'assessment': assessment
    })

def thank_you(request):
    """Simple view for the thank you page after assessment completion"""
    return render(request, 'baseapp/thank_you.html')


#admin views
#--overall
@user_passes_test(is_admin)
def admin_dashboard(request):
    """Admin dashboard showing both HR and admin features"""
    # Handle business switching
    if 'business' in request.GET:
        business_id = request.GET.get('business')
        business = get_object_or_404(Business, id=business_id)
        request.user.set_current_business(business)
        return redirect('baseapp:admin_dashboard')
    
    # Ensure admin has a current business selected
    if not request.user.current_business:
        first_business = Business.objects.first()
        if first_business:
            request.user.set_current_business(first_business)
        else:
            messages.error(request, 'No businesses exist in the system.')
            return redirect('admin:index')
    
    current_business = request.user.current_business
    
    # Get all assessments for current business with related data
    assessments = Assessment.objects.filter(
        business=current_business
    ).select_related(
        'created_by',
        'assessmentresponse'
    ).prefetch_related(
        'benchmark_batch'
    ).order_by('-created_at')

    # Get statistics
    hr_users_count = CustomUser.objects.filter(
        is_hr=True, 
        business=current_business
    ).count()
    
    assessments_count = assessments.count()
    pending_assessments_count = assessments.filter(completed=False).count()
    
    # Calculate benchmark completion
    benchmark_assessments = assessments.filter(assessment_type='benchmark')
    if benchmark_assessments.exists():
        completed = benchmark_assessments.filter(completed=True).count()
        total = benchmark_assessments.count()
        benchmark_completion = round((completed / total) * 100 if total > 0 else 0, 1)
    else:
        benchmark_completion = 0
    
    # Get benchmark batches with completion rates and prefetch related assessments
    benchmark_batches = BenchmarkBatch.objects.filter(
        business=current_business
    ).prefetch_related('assessment_set')
    
    for batch in benchmark_batches:
        total = batch.assessment_set.count()
        completed = batch.assessment_set.filter(completed=True).count()
        batch.completion_rate = round((completed / total * 100) if total > 0 else 0, 1)
    
    # Get all active attributes for the attributes tab
    attributes = Attribute.objects.filter(
        business=current_business,
        active=True
    ).order_by('name')
    
    # Get all HR users for the user management tab
    hr_users = CustomUser.objects.filter(
        is_hr=True,
        business=current_business
    ).order_by('email')
    
    # Get recent activity (last 10 assessments created or completed)
    recent_activity = assessments[:10]
    
    context = {
        'businesses': Business.objects.all(),
        'hr_users_count': hr_users_count,
        'assessments': assessments,
        'assessments_count': assessments_count,
        'pending_assessments_count': pending_assessments_count,
        'benchmark_completion': benchmark_completion,
        'benchmark_batches': benchmark_batches,
        'attributes': attributes,
        'hr_users': hr_users,
        'recent_activity': recent_activity,
        'business': current_business,
    }
    
    return render(request, 'baseapp/admin/dashboard.html', context)

#--business
@require_http_methods(["GET", "POST"])
@user_passes_test(is_admin)
def business_list_create(request):
    if request.method == "POST":
        data = json.loads(request.body)
        business = Business.objects.create(
            name=data['name'],
            slug=data['slug'],
            primary_color=data.get('primaryColor', '#000000')
        )
        return JsonResponse({
            "id": business.id,
            "name": business.name,
            "slug": business.slug,
            "primary_color": business.primary_color
        })
    else:
        businesses = Business.objects.all()
        return JsonResponse({
            "businesses": list(businesses.values())
        })

@require_http_methods(["GET"])
@user_passes_test(is_admin)
def list_businesses(request):
    """
    List all businesses with minimal details
    """
    businesses = Business.objects.all().values(
        'id', 
        'name', 
        'primary_color', 
        'assessment_template_uploaded'
    )
    return JsonResponse({
        'businesses': list(businesses)
    })

@require_http_methods(["GET"])
@user_passes_test(is_admin)
def business_details(request, business_id):
    """
    Get comprehensive details for a specific business
    """
    try:
        business = Business.objects.get(pk=business_id)
        
        # Get HR users for this business
        hr_users = CustomUser.objects.filter(
            business=business, 
            is_hr=True
        ).values('id', 'email', 'first_name', 'last_name', 'is_active')
        
        # Get question pairs for this business
        question_pairs = QuestionPair.objects.filter(
            business=business
        ).select_related('attribute1', 'attribute2').values(
            'id', 
            'attribute1__name', 
            'attribute2__name',
            'statement_a', 
            'statement_b'
        )
        
        return JsonResponse({
            'business': {
                'id': business.id,
                'name': business.name,
                'primary_color': business.primary_color,
                'assessment_template_uploaded': business.assessment_template_uploaded
            },
            'hr_users': list(hr_users),
            'question_pairs': list(question_pairs)
        })
    except Business.DoesNotExist:
        return JsonResponse({"error": "Business not found"}, status=404)

@require_http_methods(["GET", "PUT", "DELETE"])
@user_passes_test(is_admin)
def business_detail(request, pk):
    try:
        business = Business.objects.get(pk=pk)
    except Business.DoesNotExist:
        return JsonResponse({"error": "Business not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({
            "id": business.id,
            "name": business.name,
            "slug": business.slug,
            "primary_color": business.primary_color,
            "assessment_template_uploaded": business.assessment_template_uploaded
        })
    elif request.method == "PUT":
        data = json.loads(request.body)
        business.name = data.get('name', business.name)
        business.slug = data.get('slug', business.slug)
        business.primary_color = data.get('primaryColor', business.primary_color)
        business.save()
        return JsonResponse({"message": "Business updated successfully"})
    else:  # DELETE
        try:
            # Delete all related data
            # HR Users
            CustomUser.objects.filter(business=business).delete()
            
            # Attributes
            Attribute.objects.filter(business=business).delete()
            
            # Question Pairs
            QuestionPair.objects.filter(business=business).delete()
            
            # Assessments
            Assessment.objects.filter(business=business).delete()
            
            # Benchmark Batches
            BenchmarkBatch.objects.filter(business=business).delete()
            
            # Finally delete the business
            business.delete()
            
            return JsonResponse({"message": "Business deleted successfully"})
        except Exception as e:
            return JsonResponse({
                "error": f"Error deleting business: {str(e)}"
            }, status=500)
        
#--hr
@require_http_methods(["GET", "PUT", "DELETE"])
@user_passes_test(is_admin)
def hr_user_detail(request, pk):
    try:
        user = CustomUser.objects.get(pk=pk, is_hr=True)
    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "HR user not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({
            "id": user.id,
            "email": user.email,
            "business_id": user.business_id,
            "is_active": user.is_active,
            "first_name": user.first_name,
            "last_name": user.last_name
        })
    elif request.method == "PUT":
        data = json.loads(request.body)
        if 'email' in data:
            user.email = data['email']
            user.username = data['email']
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'password' in data:
            user.set_password(data['password'])
        user.save()
        return JsonResponse({"message": "HR user updated successfully"})
    else:  # DELETE
        user.is_active = False  # Soft delete
        user.save()
        return JsonResponse({"message": "HR user deactivated successfully"})

@require_http_methods(["GET", "POST"])
@user_passes_test(is_admin)
def hr_user_list_create(request):
    if request.method == "POST":
        data = json.loads(request.body)
        user = CustomUser.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            is_hr=True,
            business_id=data['business_id']
        )
        return JsonResponse({
            "id": user.id,
            "email": user.email,
            "business_id": user.business_id
        })
    else:
        users = CustomUser.objects.filter(is_hr=True)
        return JsonResponse({
            "users": list(users.values('id', 'email', 'business_id', 'is_active'))
        })

@require_http_methods(["POST"])
@user_passes_test(is_admin)
def hr_user_reset_password(request, pk):
    try:
        user = get_object_or_404(CustomUser, pk=pk, is_hr=True)
        
        # Generate reset token (16 chars is sufficient) 
        reset_token = generate_secure_token(
            entity_id=user.id,
            token_type='hr_reset',
            length=16
        )
        
        # Store reset token in user's session with expiry
        request.session[f'password_reset_{reset_token}'] = {
            'user_id': user.id,
            'expires': (timezone.now() + timezone.timedelta(hours=24)).isoformat()
        }
        
        # Generate reset URL
        reset_url = request.build_absolute_uri(
            reverse('baseapp:password_reset_confirm', args=[reset_token])
        )
        
        # Send reset email
        send_mail(
            subject='Password Reset Request',
            message=f'''A password reset has been requested for your account.

Click the following link to reset your password:
{reset_url}

This link will expire in 24 hours.

If you did not request this reset, please contact your administrator.''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return JsonResponse({
            "message": "Password reset email sent successfully"
        })
        
    except Exception as e:
        return JsonResponse({
            "error": f"Failed to process password reset: {str(e)}"
        }, status=400)

@require_http_methods(["GET"])
@user_passes_test(is_admin)
def business_hr_users(request, business_id):
    users = CustomUser.objects.filter(
        business_id=business_id,
        is_hr=True
    ).values('id', 'email', 'is_active')
    return JsonResponse({"users": list(users)})

#--assessment info
@require_http_methods(["POST"])
@user_passes_test(is_admin)
def upload_assessment_template(request, business_id):
    try:
        business = Business.objects.get(pk=business_id)
        
        if 'file' not in request.FILES:
            return JsonResponse({
                "error": "No file uploaded. Please upload a CSV file."
            }, status=400)
        
        file = request.FILES['file']
        if not file.name.lower().endswith('.csv'):
            return JsonResponse({
                "error": "Invalid file type. Please upload a CSV file."
            }, status=400)

        decoded_file = file.read().decode('utf-8')
        reader = csv.DictReader(StringIO(decoded_file))
        
        expected_columns = [
            ('attribute1', 'Attribute-A'), 
            ('attribute2', 'Attribute-B'), 
            ('statement_a', 'Statement-A'), 
            ('statement_b', 'Statement-B')
        ]
        
        found_columns = reader.fieldnames or []
        missing_columns = []
        column_mapping = {}
        
        for expected, alternate in expected_columns:
            if expected in found_columns:
                column_mapping[expected] = expected
            elif alternate in found_columns:
                column_mapping[expected] = alternate
            else:
                missing_columns.append(f"{expected} (or {alternate})")
        
        if missing_columns:
            return JsonResponse({
                "error": f"Missing required columns: {', '.join(missing_columns)}"
            }, status=400)
        
        # Create a set to track unique statement pairs
        existing_pairs = set()
        new_pairs = []
        
        for row in reader:
            # Create a unique identifier for this pair
            pair_key = (
                row[column_mapping['statement_a']].strip(),
                row[column_mapping['statement_b']].strip()
            )
            
            # Skip if we've seen this pair before
            if pair_key in existing_pairs:
                continue
                
            existing_pairs.add(pair_key)
            
            # Get or create attributes
            attr1, _ = Attribute.objects.get_or_create(
                name=row[column_mapping['attribute1']].strip(),
                business=business,
                defaults={'active': True}
            )
            attr2, _ = Attribute.objects.get_or_create(
                name=row[column_mapping['attribute2']].strip(),
                business=business,
                defaults={'active': True}
            )
            
            # Check if this pair already exists in the database
            existing_pair = QuestionPair.objects.filter(
                business=business,
                statement_a=row[column_mapping['statement_a']].strip(),
                statement_b=row[column_mapping['statement_b']].strip()
            ).first()
            
            if not existing_pair:
                new_pairs.append(QuestionPair(
                    business=business,
                    attribute1=attr1,
                    attribute2=attr2,
                    statement_a=row[column_mapping['statement_a']].strip(),
                    statement_b=row[column_mapping['statement_b']].strip(),
                    order=len(new_pairs) + 1
                ))
        
        # Bulk create new pairs
        QuestionPair.objects.bulk_create(new_pairs)
        
        # Mark business as having uploaded assessment template
        business.assessment_template_uploaded = True
        business.save()
        
        return JsonResponse({
            "message": f"Successfully imported {len(new_pairs)} question pairs",
            "count": len(new_pairs)
        })
    
    except Exception as e:
        return JsonResponse({
            "error": f"Unexpected error importing questions: {str(e)}"
        }, status=400)

@require_http_methods(["PUT", "DELETE"])
@user_passes_test(is_admin)
def question_pair_detail(request, pk):
    try:
        pair = QuestionPair.objects.get(pk=pk)
        
        if request.method == "DELETE":
            pair.delete()
            return JsonResponse({"message": "Question pair deleted successfully"})
            
        elif request.method == "PUT":
            data = json.loads(request.body)
            
            # Get or create attributes
            attr1, _ = Attribute.objects.get_or_create(
                name=data['attribute1'],
                business=pair.business,
                defaults={'active': True}
            )
            attr2, _ = Attribute.objects.get_or_create(
                name=data['attribute2'],
                business=pair.business,
                defaults={'active': True}
            )
            
            # Update pair
            pair.attribute1 = attr1
            pair.attribute2 = attr2
            pair.statement_a = data['statement_a']
            pair.statement_b = data['statement_b']
            pair.save()
            
            return JsonResponse({
                "message": "Question pair updated successfully",
                "pair": {
                    "id": pair.id,
                    "attribute1__name": attr1.name,
                    "attribute2__name": attr2.name,
                    "statement_a": pair.statement_a,
                    "statement_b": pair.statement_b
                }
            })
            
    except QuestionPair.DoesNotExist:
        return JsonResponse({"error": "Question pair not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@require_http_methods(["GET"])
@user_passes_test(is_admin)
def question_pair_list(request):
    pairs = QuestionPair.objects.filter(
        business=request.user.current_business
    ).values(
        'id', 'attribute1__name', 'attribute2__name',
        'statement_a', 'statement_b', 'order', 'active'
    )
    return JsonResponse({"question_pairs": list(pairs)})

@require_http_methods(["GET"])
@user_passes_test(is_admin)
def attribute_list(request):
    attributes = Attribute.objects.filter(
        business=request.user.current_business
    ).values('id', 'name', 'description', 'order', 'active')
    return JsonResponse({"attributes": list(attributes)})

#--benchmark
@require_http_methods(["GET"])
@user_passes_test(is_admin)
def benchmark_emails(request, business_id):
    """Get all benchmark emails for a business"""
    try:
        # Get all benchmark assessments for the business
        assessments = Assessment.objects.filter(
            business_id=business_id,
            assessment_type='benchmark'
        ).values(
            'candidate_email',
            'region',
            'completed',
            'unique_link'
        )
        
        # Format the data
        emails = [{
            'email': assessment['candidate_email'],
            'region': assessment['region'],
            'sent': bool(assessment['unique_link']),  # If has link, it was sent
            'completed': assessment['completed']
        } for assessment in assessments]
        
        return JsonResponse({'emails': emails})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["POST"])
@user_passes_test(is_admin)
def add_benchmark_emails(request, business_id):
    """Add new benchmark emails"""
    try:
        data = json.loads(request.body)
        emails = data.get('emails', [])
        
        created_assessments = []
        for email_data in emails:
            # Check if assessment already exists
            existing = Assessment.objects.filter(
                business_id=business_id,
                assessment_type='benchmark',
                candidate_email=email_data['email']
            ).first()
            
            if not existing:
                # Create new assessment
                assessment = Assessment.objects.create(
                    business_id=business_id,
                    assessment_type='benchmark',
                    candidate_email=email_data['email'],
                    candidate_name=email_data['email'].split('@')[0],  # Basic name from email
                    region=email_data['region'],
                    position='Benchmark Assessment',
                    manager_name=request.user.get_full_name() or request.user.username,
                    manager_email=request.user.email,
                    created_by=request.user
                )
                created_assessments.append(assessment)
        
        return JsonResponse({
            'message': f'Successfully added {len(created_assessments)} new benchmark emails'
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["POST"])
@user_passes_test(is_admin)
def send_benchmark_email(request, business_id):
    """Send or resend benchmark assessment email"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        
        # Get the assessment
        assessment = Assessment.objects.get(
            business_id=business_id,
            assessment_type='benchmark',
            candidate_email=email
        )
        
        # Generate new unique link with our improved function
        assessment.unique_link = generate_secure_token(
            entity_id=assessment.id,
            token_type='benchmark',
            length=16
        )
        assessment.save()
        
        # Generate the assessment URL
        assessment_url = request.build_absolute_uri(
            reverse('baseapp:take_assessment', args=[assessment.unique_link])
        )
        
        # Send email
        subject = f'Benchmark Assessment for {assessment.business.name}'
        message = f"""
Hello,

You have been selected to participate in a benchmark assessment for {assessment.business.name}.

Please click the following link to complete your assessment:
{assessment_url}

This is a new link for your assessment. Any previous links sent will no longer work.

Best regards,
Work Force Compass Admin
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        
        return JsonResponse({
            'message': f'Successfully sent benchmark assessment email to {email}'
        })
    except Assessment.DoesNotExist:
        return JsonResponse({
            'error': 'Assessment not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["GET"])
@user_passes_test(is_admin)
def benchmark_results(request, business_id):
    """Get benchmark results, optionally filtered by region"""
    print(f"Fetching benchmark results for business {business_id}")  # Debug log
    try:
        region = request.GET.get('region', 'all')
        
        # Start with all completed benchmark assessments
        assessments = AssessmentResponse.objects.filter(
            assessment__business_id=business_id,
            assessment__assessment_type='benchmark',
            assessment__completed=True
        )
        
        # Apply region filter if specified
        if region != 'all':
            assessments = assessments.filter(assessment__region=region)
        
        # If no completed assessments, return empty results instead of error
        if not assessments.exists():
            return JsonResponse({'results': []})
        
        # Get all attributes for the business
        attributes = Attribute.objects.filter(
            business_id=business_id,
            active=True
        )
        
        # Calculate results for each attribute
        results = []
        print(f"Found {assessments.count()} completed assessments")  # Debug log
        for attribute in attributes:
            total_score = 0
            responses = 0
            
            for assessment_response in assessments:
                score = assessment_response.get_score_for_attribute(attribute)
                if score is not None:
                    total_score += float(score)  # Ensure we're working with float values
                    responses += 1
            
            if responses > 0:
                results.append({
                    'attribute': attribute.name,
                    'score': round(total_score / responses, 2),  # Round to 2 decimal places
                    'responses': responses
                })
        
        return JsonResponse({'results': results})
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'results': []
        }, status=500)

#--admin assessment
@require_http_methods(["GET"])
@user_passes_test(is_admin)
def business_assessments(request, business_id):
    """Get all assessments for a business"""
    try:
        assessments = Assessment.objects.filter(
            business_id=business_id
        ).select_related(
            'created_by'
        ).order_by('-created_at').values(
            'id', 
            'candidate_name',
            'candidate_email',
            'position',
            'created_at',
            'completed',
            'unique_link',
            'assessment_type'  # Added this field
        )
        
        return JsonResponse({
            'assessments': list(assessments)
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["GET", "POST"])
@user_passes_test(is_admin)
def admin_create_assessment(request, business_id):
    """AJAX endpoint for admin to create assessments"""
    try:
        business = Business.objects.get(pk=business_id)
        
        # Get the HR user for this business
        hr_user = CustomUser.objects.filter(
            business=business,
            is_hr=True,
            is_active=True
        ).first()
        
        if not hr_user:
            return JsonResponse({
                'error': 'No active HR user found for this business. Please add an HR user first.'
            }, status=400)
        
        if request.method == "POST":
            data = json.loads(request.body)
            assessment = Assessment.objects.create(
                business=business,
                assessment_type='standard',
                candidate_name=data['candidate_name'],
                candidate_email=data['candidate_email'],
                position=data['position'],
                region=data['region'],
                manager_name=data['manager_name'],
                manager_email=data['manager_email'],
                created_by=hr_user  # Set the HR user as the creator
            )
            
            # Generate a secure unique link with our improved function
            # Note: We need to save first to have an ID, then update with the unique link
            assessment.unique_link = generate_secure_token(
                entity_id=assessment.id,
                token_type='assessment',
                length=16
            )
            assessment.save(update_fields=['unique_link'])
            
            # Generate assessment link
            assessment_link = request.build_absolute_uri(
                reverse('baseapp:take_assessment', args=[assessment.unique_link])
            )
            
            # Send email to candidate
            try:
                subject = 'Assessment Invitation'
                message = f'''Dear {assessment.candidate_name},

You have been invited to complete an assessment for the position of {assessment.position}.
Please click the following link to complete your assessment:

{assessment_link}

This link is unique to you and can only be used once.

Best regards,
{assessment.manager_name}'''
                
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [assessment.candidate_email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Email error: {e}")
                
            return JsonResponse({
                'message': 'Assessment created successfully',
                'assessment': {
                    'id': assessment.id,
                    'candidate_name': assessment.candidate_name,
                    'position': assessment.position,
                    'created_at': assessment.created_at.isoformat(),
                    'completed': assessment.completed,
                    'unique_link': assessment.unique_link
                }
            })
            
        return JsonResponse({
            'fields': ['candidate_name', 'candidate_email', 'position', 'region', 
                      'manager_name', 'manager_email']
        })
        
    except Business.DoesNotExist:
        return JsonResponse({'error': 'Business not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["GET"])
@user_passes_test(is_admin)
def admin_preview_assessment(request, assessment_id):
    """Admin view to preview assessment report PDF"""
    try:
        # Get assessment and verify it exists
        assessment = get_object_or_404(Assessment, id=assessment_id)
        
        if not assessment.completed:
            print(f"Assessment not completed")
            raise Http404("Assessment not completed")
        
        # Get assessment response
        response = get_object_or_404(AssessmentResponse, assessment=assessment)
        
        # Get all attributes for this assessment
        attributes = Attribute.objects.filter(
            business=assessment.business,
            active=True
        ).order_by('order')
        
        for attr in attributes:
            score = response.get_score_for_attribute(attr)
        
        # Define the report path
        reports_dir = os.path.join(settings.MEDIA_ROOT, 'assessment_reports')
        pdf_filename = f'assessment_report_{assessment.unique_link}.pdf'
        pdf_path = os.path.join(reports_dir, pdf_filename)
        
        try:
            # Generate new PDF
            pdf_path = generate_assessment_report(response)
            
            if not os.path.exists(pdf_path):
                raise FileNotFoundError(f"Generated PDF not found at {pdf_path}")
            
            # Return PDF response
            pdf_file = open(pdf_path, 'rb')
            response = FileResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{pdf_filename}"'
            response['X-Frame-Options'] = 'SAMEORIGIN'
            return response
            
        except Exception as e:
            print(f"Error generating PDF: {str(e)}")
            raise
            
    except Exception as e:
        print(f"Error in preview: {str(e)}")
        raise Http404(f"Error generating PDF report: {str(e)}")
    
@require_http_methods(["GET"])
@user_passes_test(is_admin)
def admin_download_assessment(request, assessment_id):
    """Admin view to download assessment report"""
    assessment = get_object_or_404(Assessment, id=assessment_id)
    try:
        response = AssessmentResponse.objects.get(assessment=assessment)
        pdf_path = generate_assessment_report(response)
        response = FileResponse(
            open(pdf_path, 'rb'), 
            content_type='application/pdf'
        )
        response['Content-Disposition'] = f'attachment; filename="assessment_report_{assessment.candidate_name}.pdf"'
        return response
    except AssessmentResponse.DoesNotExist:
        raise Http404("Assessment response not found")

@require_http_methods(["POST"])
@user_passes_test(is_admin)
def admin_resend_assessment(request, assessment_id):
    """Admin endpoint to resend assessment email"""
    try:
        assessment = get_object_or_404(Assessment, id=assessment_id)
        
        # Generate new unique link with our improved function
        assessment.unique_link = generate_secure_token(
            entity_id=assessment.id,
            token_type='assessment',
            length=16
        )
        assessment.save()
        
        # Generate the assessment URL
        assessment_url = request.build_absolute_uri(
            reverse('baseapp:take_assessment', args=[assessment.unique_link])
        )
        
        # Send email
        subject = f'Assessment for {assessment.position}'
        message = f"""
Hello {assessment.candidate_name},

You have been invited to complete an assessment for the {assessment.position} position.

Please click the following link to complete your assessment:
{assessment_url}

This is a new link for your assessment. Any previous links sent will no longer work.

Best regards,
{assessment.manager_name}
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[assessment.candidate_email],
            fail_silently=False,
        )
        
        return JsonResponse({
            'message': f'Successfully resent assessment email to {assessment.candidate_email}'
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
 

#hr views
@login_required
@user_passes_test(is_hr_user)
def dashboard(request):
    """Dashboard view for HR users to see all assessments"""
    # Changed from created_by=request.user to business=request.user.business
    assessments = Assessment.objects.filter(
        business=request.user.business,
        assessment_type='standard'  # Only show standard assessments, not benchmarks
    ).order_by('-created_at')
    
    return render(request, 'baseapp/dashboard.html', {
        'assessments': assessments
    })

@login_required
@user_passes_test(is_hr_user)
def create_assessment(request):
    """View for HR users to create new assessments"""
    if request.method == 'POST':
        # Pass the current user's business to the form
        form = AssessmentCreationForm(request.POST, business=request.user.business)
        if form.is_valid():
            assessment = form.save(commit=False)
            assessment.created_by = request.user
            # Explicitly set the business
            assessment.business = request.user.business
            assessment.save()
            
            # Generate a secure unique link with our improved function
            assessment.unique_link = generate_secure_token(
                entity_id=assessment.id,
                token_type='assessment',
                length=16
            )
            assessment.save(update_fields=['unique_link'])
            
            # Generate assessment link
            assessment_link = request.build_absolute_uri(
                reverse('baseapp:take_assessment', args=[assessment.unique_link])
            )
            
            # Send email to candidate
            try:
                subject = 'Assessment Invitation'
                message = f'''Dear {assessment.candidate_name},

You have been invited to complete an assessment for the position of {assessment.position}.
Please click the following link to complete your assessment:

{assessment_link}

This link is unique to you and can only be used once.

Best regards,
{request.user.get_full_name() or request.user.username}'''
                
                email = EmailMessage(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [assessment.candidate_email]
                )
                email.send()
                messages.success(request, 'Assessment created and invitation sent successfully!')
            except Exception as e:
                messages.error(request, 'Failed to send invitation email. Please try again.')
                print(f"Email error: {e}")
            
            return redirect('baseapp:dashboard')
    else:
        form = AssessmentCreationForm()
    
    return render(request, 'baseapp/assessment_form.html', {'form': form})

@login_required
@user_passes_test(is_hr_user)
def resend_assessment(request, assessment_id):
    """
    Resend assessment email to candidate with a new unique link
    """
    # Get the assessment
    assessment = get_object_or_404(Assessment, id=assessment_id)
    
    try:
        # Generate new unique link with our improved function
        assessment.unique_link = generate_secure_token(
            entity_id=assessment.id,
            token_type='assessment',
            length=16
        )
        assessment.save()
        
        # Generate the full assessment URL
        assessment_url = request.build_absolute_uri(
            reverse('baseapp:take_assessment', args=[assessment.unique_link])
        )
        
        # Email content
        subject = f'Front-Line Worker Assessment for {assessment.position}'
        message = f"""
Hello {assessment.candidate_name},

You have been invited to complete an assessment for the {assessment.position} position.

Please click the following link to complete your assessment:
{assessment_url}

This is a new link for your assessment. Any previous links sent will no longer work.

Best regards,
{assessment.manager_name}
        """
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[assessment.candidate_email],
            fail_silently=False,
        )
        
        # Add success message
        messages.success(
            request, 
            f'Assessment link has been resent to {assessment.candidate_email}'
        )
        
    except Exception as e:
        # Log the error
        print(f"Error resending assessment {assessment_id}: {str(e)}")
        # Add error message
        messages.error(
            request, 
            'There was an error resending the assessment. Please try again.'
        )
    
    # Change this line to redirect to the dashboard instead of assessment_list
    return redirect('baseapp:dashboard')

@login_required
@user_passes_test(is_hr_user)
def preview_assessment_report(request, assessment_id):
    """
    View to preview assessment report PDF. 
    """
    assessment = get_object_or_404(Assessment, id=assessment_id)
    if not assessment.completed:
        raise Http404("Assessment not completed")
        
    response = get_object_or_404(AssessmentResponse, assessment=assessment)
    
    # Define the report path
    reports_dir = os.path.join(settings.MEDIA_ROOT, 'assessment_reports')
    pdf_filename = f'assessment_report_{assessment.unique_link}.pdf'
    pdf_path = os.path.join(reports_dir, pdf_filename)
    
    try:
        # Open and return the PDF file
        pdf_file = open(pdf_path, 'rb')
        response = FileResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{pdf_filename}"'
        
        # Allow iframe display
        response['X-Frame-Options'] = 'SAMEORIGIN'
        
        return response
        
    except FileNotFoundError:
        # If PDF doesn't exist, generate it
        try:
            from .utils.report_generator import generate_assessment_report
            pdf_path = generate_assessment_report(response)
            pdf_file = open(pdf_path, 'rb')
            response = FileResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{pdf_filename}"'
            
            # Allow iframe display
            response['X-Frame-Options'] = 'SAMEORIGIN'
            
            return response
            
        except Exception as e:
            print(f"Error generating PDF: {str(e)}")
            raise Http404("Error generating PDF report")

@login_required
@user_passes_test(is_hr_user)
def download_assessment_report(request, assessment_id):
    assessment = get_object_or_404(Assessment, id=assessment_id, created_by=request.user)
    try:
        response = AssessmentResponse.objects.get(assessment=assessment)
        pdf_path = generate_assessment_report(response)
        response = FileResponse(open(pdf_path, 'rb'), 
                              content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="assessment_report_{assessment.candidate_name}.pdf"'
        return response
    except AssessmentResponse.DoesNotExist:
        messages.error(request, 'Assessment response not found.')
        return redirect('baseapp:dashboard')