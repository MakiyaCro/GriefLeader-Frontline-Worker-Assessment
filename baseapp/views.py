from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.core.mail import EmailMessage, send_mail, send_mass_mail
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
from .forms import AssessmentCreationForm, AssessmentResponseForm, BenchmarkBatchForm
from .utils.report_generator import generate_assessment_report
import os
from io import StringIO

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

def redirect_user(user):
    """Helper function to redirect users based on their type"""
    if user.is_superuser:
        return redirect('baseapp:admin_dashboard')
    elif user.is_hr:
        return redirect('baseapp:dashboard')
    return redirect('baseapp:home')


def logout_view(request):
    """Handle user logout"""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('baseapp:login')

def businesses_content(request):
    businesses = Business.objects.all()
    return render(request, 'partials/businesses_table.html', {'businesses': businesses})

def hr_users_content(request):
    hr_users = CustomUser.objects.all()
    return render(request, 'partials/hr_users_table.html', {'hr_users': hr_users})

def assessments_content(request):
    question_pairs = QuestionPair.objects.all()
    return render(request, 'partials/assessments_table.html', {'question_pairs': question_pairs})


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
            "primary_color": business.primary_color
        })
    elif request.method == "PUT":
        data = json.loads(request.body)
        business.name = data.get('name', business.name)
        business.slug = data.get('slug', business.slug)
        business.primary_color = data.get('primaryColor', business.primary_color)
        business.save()
        return JsonResponse({"message": "Business updated successfully"})
    else:  # DELETE
        business.delete()
        return JsonResponse({"message": "Business deleted successfully"})

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

@require_http_methods(["GET"])
@user_passes_test(is_admin)
def business_hr_users(request, business_id):
    users = CustomUser.objects.filter(
        business_id=business_id,
        is_hr=True
    ).values('id', 'email', 'is_active')
    return JsonResponse({"users": list(users)})

@require_http_methods(["POST"])
@user_passes_test(is_admin)
def import_question_pairs(request):
    if 'file' not in request.FILES:
        return JsonResponse({"error": "No file provided"}, status=400)
        
    file = request.FILES['file']
    decoded_file = file.read().decode('utf-8')
    
    pairs = []
    reader = csv.DictReader(StringIO(decoded_file))
    
    try:
        for row in reader:
            # Get or create attributes
            attr1, _ = Attribute.objects.get_or_create(
                name=row['attribute1'],
                business_id=request.user.current_business.id
            )
            attr2, _ = Attribute.objects.get_or_create(
                name=row['attribute2'],
                business_id=request.user.current_business.id
            )
            
            # Create question pair
            pair = QuestionPair.objects.create(
                business=request.user.current_business,
                attribute1=attr1,
                attribute2=attr2,
                statement_a=row['statement_a'],
                statement_b=row['statement_b'],
                order=len(pairs) + 1
            )
            pairs.append(pair)
            
        return JsonResponse({
            "message": f"Successfully imported {len(pairs)} question pairs"
        })
    except Exception as e:
        return JsonResponse({
            "error": f"Error importing questions: {str(e)}"
        }, status=400)

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

@user_passes_test(is_admin)
def create_benchmark_batch(request, business_id):
    """Create a new benchmark batch and process uploaded file"""
    business = get_object_or_404(Business, id=business_id)
    
    if request.method == 'POST':
        form = BenchmarkBatchForm(request.POST, request.FILES)
        if form.is_valid():
            batch = form.save(commit=False)
            batch.business = business
            batch.created_by = request.user
            batch.save()
            
            try:
                # Read the uploaded file
                if batch.data_file.name.endswith('.csv'):
                    df = pd.read_csv(batch.data_file)
                else:
                    df = pd.read_excel(batch.data_file)
                
                # Validate required columns
                required_columns = ['name', 'email']
                if not all(col in df.columns for col in required_columns):
                    raise ValueError("Missing required columns: name and email")
                
                # Create assessments for each person
                assessment_data = []
                for _, row in df.iterrows():
                    assessment = Assessment(
                        business=business,
                        assessment_type='benchmark',
                        benchmark_batch=batch,
                        candidate_name=row['name'],
                        candidate_email=row['email'],
                        position='Benchmark Assessment',
                        region=row.get('region', 'N/A'),
                        manager_name=request.user.get_full_name() or request.user.username,
                        manager_email=request.user.email,
                        created_by=request.user
                    )
                    assessment.save()
                    
                    # Prepare email data
                    subject = f'Benchmark Assessment for {business.name}'
                    message = f"""
                    Hello {row['name']},
                    
                    You have been selected to participate in a benchmark assessment for {business.name}.
                    Please click the following link to complete your assessment:
                    
                    {request.build_absolute_uri(f'/assessment/{assessment.unique_link}/')}
                    
                    Your participation is greatly appreciated.
                    
                    Best regards,
                    {request.user.get_full_name() or request.user.username}
                    """
                    
                    assessment_data.append((
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [row['email']]
                    ))
                
                # Send all emails
                send_mass_mail(assessment_data)
                
                batch.processed = True
                batch.save()
                
                messages.success(
                    request, 
                    f'Successfully created {len(df)} benchmark assessments and sent invitations.'
                )
                return redirect('admin_dashboard')
                
            except Exception as e:
                batch.delete()  # Clean up the batch if processing fails
                messages.error(request, f'Error processing file: {str(e)}')
                return redirect('create_benchmark_batch', business_id=business_id)
    else:
        form = BenchmarkBatchForm()
    
    return render(request, 'baseapp/admin/create_benchmark_batch.html', {
        'form': form,
        'business': business
    })

@user_passes_test(is_admin)
def view_benchmark_results(request, business_id):
    """View benchmark results for a specific business"""
    business = get_object_or_404(Business, id=business_id)
    benchmark_batches = BenchmarkBatch.objects.filter(business=business)
    
    # Calculate average scores for each attribute
    from django.db.models import Avg
    from .models import Attribute, AssessmentResponse
    
    attributes = Attribute.objects.filter(business=business, active=True)
    benchmark_data = {}
    
    for attribute in attributes:
        # Get all completed benchmark assessments
        benchmark_responses = AssessmentResponse.objects.filter(
            assessment__business=business,
            assessment__assessment_type='benchmark',
            assessment__completed=True
        )
        
        scores = []
        for response in benchmark_responses:
            score = response.get_score_for_attribute(attribute)
            if score is not None:
                scores.append(score)
        
        if scores:
            avg_score = sum(scores) / len(scores)
            benchmark_data[attribute.name] = {
                'average': avg_score,
                'count': len(scores)
            }
    
    return render(request, 'baseapp/admin/benchmark_results.html', {
        'business': business,
        'benchmark_data': benchmark_data,
        'batches': benchmark_batches
    })


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
    
@login_required
@user_passes_test(is_hr_user)
def resend_assessment(request, assessment_id):
    """
    Resend assessment email to candidate with a new unique link
    """
    # Get the assessment
    assessment = get_object_or_404(Assessment, id=assessment_id)
    
    try:
        # Generate new unique link
        assessment.unique_link = get_random_string(64)
        assessment.save()
        
        # Generate the full assessment URL
        assessment_url = request.build_absolute_uri(
            reverse('take_assessment', args=[assessment.unique_link])
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
    
    # Redirect back to assessment list
    return redirect('assessment_list')

@login_required
@user_passes_test(is_hr_user)
def dashboard(request):
    """Dashboard view for HR users to see all assessments"""
    assessments = Assessment.objects.filter(created_by=request.user).order_by('-created_at')
    return render(request, 'baseapp/dashboard.html', {
        'assessments': assessments
    })

@login_required
@user_passes_test(is_hr_user)
def create_assessment(request):
    """View for HR users to create new assessments"""
    if request.method == 'POST':
        form = AssessmentCreationForm(request.POST)
        if form.is_valid():
            assessment = form.save(commit=False)
            assessment.created_by = request.user
            assessment.save()
            
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

def take_assessment(request, unique_link):
    """View for candidates to take their assessment"""
    assessment = get_object_or_404(Assessment, unique_link=unique_link)
    
    # Check if assessment is already completed
    if assessment.completed:
        messages.error(request, 'This assessment has already been completed.')
        return render(request, 'baseapp/assessment_closed.html')
    
    # Get all active question pairs
    question_pairs = QuestionPair.objects.filter(active=True).order_by('order')
    
    if request.method == 'POST':
        form = AssessmentResponseForm(request.POST, question_pairs=question_pairs)
        if form.is_valid():
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
                # Generate PDF report
                pdf_path = generate_assessment_report(assessment_response)
                
                # Send email with PDF attachment
                email = EmailMessage(
                    f'Assessment Report - {assessment.candidate_name}',
                    f'Please find attached the assessment report for {assessment.candidate_name}.',
                    settings.DEFAULT_FROM_EMAIL,
                    [assessment.manager_email]
                )
                
                # Attach the PDF
                with open(pdf_path, 'rb') as f:
                    email.attach(
                        f'assessment_report_{assessment.candidate_name}.pdf',
                        f.read(),
                        'application/pdf'
                    )
                email.send()
                
                # Clean up the PDF file after sending
                os.remove(pdf_path)
                
            except Exception as e:
                print(f"Failed to send report email: {e}")
            
            return render(request, 'baseapp/thank_you.html')
    else:
        form = AssessmentResponseForm(question_pairs=question_pairs)
    
    return render(request, 'baseapp/take_assessment.html', {
        'form': form,
        'assessment': assessment
    })

@login_required
@user_passes_test(is_hr_user)
def view_assessment(request, assessment_id):
    """View for HR users to view completed assessments"""
    assessment = get_object_or_404(Assessment, id=assessment_id, created_by=request.user)
    try:
        response = AssessmentResponse.objects.get(assessment=assessment)
        question_responses = QuestionResponse.objects.filter(assessment_response=response)
    except AssessmentResponse.DoesNotExist:
        response = None
        question_responses = None
    
    return render(request, 'baseapp/view_assessment.html', {
        'assessment': assessment,
        'response': response,
        'question_responses': question_responses
    })



def thank_you(request):
    """Simple view for the thank you page after assessment completion"""
    return render(request, 'baseapp/thank_you.html')