# Generated by Django 5.1.4 on 2025-03-24 15:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('baseapp', '0012_manager_position_manager_region'),
    ]

    operations = [
        migrations.AlterField(
            model_name='manager',
            name='position',
            field=models.CharField(default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='manager',
            name='region',
            field=models.CharField(default='', max_length=255),
        ),
    ]
