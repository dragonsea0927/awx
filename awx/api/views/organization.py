# Copyright (c) 2018 Red Hat, Inc.
# All Rights Reserved.

# Python
import logging

# Django
from django.db.models import Count
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import ugettext_lazy as _

# AWX
from awx.conf.license import (
    feature_enabled,
    LicenseForbids,
)
from awx.main.models import (
    ActivityStream,
    Inventory,
    Host,
    Project,
    JobTemplate,
    WorkflowJobTemplate,
    Organization,
    NotificationTemplate,
    Role,
    User,
    Team,
    InstanceGroup,
)
from awx.api.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
    SubListAPIView,
    SubListCreateAttachDetachAPIView,
    SubListAttachDetachAPIView,
    ResourceAccessList,
    BaseUsersList,
)

from awx.api.serializers import (
    OrganizationSerializer,
    InventorySerializer,
    ProjectSerializer,
    UserSerializer,
    TeamSerializer,
    ActivityStreamSerializer,
    RoleSerializer,
    NotificationTemplateSerializer,
    WorkflowJobTemplateSerializer,
    InstanceGroupSerializer,
)
from awx.api.views.mixin import (
    ActivityStreamEnforcementMixin,
    RelatedJobsPreventDeleteMixin,
    OrganizationCountsMixin,
)

logger = logging.getLogger('awx.api.views.organization')


class OrganizationList(OrganizationCountsMixin, ListCreateAPIView):

    model = Organization
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        qs = Organization.accessible_objects(self.request.user, 'read_role')
        qs = qs.select_related('admin_role', 'auditor_role', 'member_role', 'read_role')
        qs = qs.prefetch_related('created_by', 'modified_by')
        return qs

    def create(self, request, *args, **kwargs):
        """Create a new organzation.

        If there is already an organization and the license of this
        instance does not permit multiple organizations, then raise
        LicenseForbids.
        """
        # Sanity check: If the multiple organizations feature is disallowed
        # by the license, then we are only willing to create this organization
        # if no organizations exist in the system.
        if (not feature_enabled('multiple_organizations') and
                self.model.objects.exists()):
            raise LicenseForbids(_('Your license only permits a single '
                                   'organization to exist.'))

        # Okay, create the organization as usual.
        return super(OrganizationList, self).create(request, *args, **kwargs)


class OrganizationDetail(RelatedJobsPreventDeleteMixin, RetrieveUpdateDestroyAPIView):

    model = Organization
    serializer_class = OrganizationSerializer

    def get_serializer_context(self, *args, **kwargs):
        full_context = super(OrganizationDetail, self).get_serializer_context(*args, **kwargs)

        if not hasattr(self, 'kwargs') or 'pk' not in self.kwargs:
            return full_context
        org_id = int(self.kwargs['pk'])

        org_counts = {}
        access_kwargs = {'accessor': self.request.user, 'role_field': 'read_role'}
        direct_counts = Organization.objects.filter(id=org_id).annotate(
            users=Count('member_role__members', distinct=True),
            admins=Count('admin_role__members', distinct=True)
        ).values('users', 'admins')

        if not direct_counts:
            return full_context

        org_counts = direct_counts[0]
        org_counts['inventories'] = Inventory.accessible_objects(**access_kwargs).filter(
            organization__id=org_id).count()
        org_counts['teams'] = Team.accessible_objects(**access_kwargs).filter(
            organization__id=org_id).count()
        org_counts['projects'] = Project.accessible_objects(**access_kwargs).filter(
            organization__id=org_id).count()
        org_counts['job_templates'] = JobTemplate.accessible_objects(**access_kwargs).filter(
            project__organization__id=org_id).count()
        org_counts['hosts'] = Host.objects.org_active_count(org_id)

        full_context['related_field_counts'] = {}
        full_context['related_field_counts'][org_id] = org_counts

        return full_context


class OrganizationInventoriesList(SubListAPIView):

    model = Inventory
    serializer_class = InventorySerializer
    parent_model = Organization
    relationship = 'inventories'


class OrganizationUsersList(BaseUsersList):

    model = User
    serializer_class = UserSerializer
    parent_model = Organization
    relationship = 'member_role.members'


class OrganizationAdminsList(BaseUsersList):

    model = User
    serializer_class = UserSerializer
    parent_model = Organization
    relationship = 'admin_role.members'


class OrganizationProjectsList(SubListCreateAttachDetachAPIView):

    model = Project
    serializer_class = ProjectSerializer
    parent_model = Organization
    relationship = 'projects'
    parent_key = 'organization'


class OrganizationWorkflowJobTemplatesList(SubListCreateAttachDetachAPIView):

    model = WorkflowJobTemplate
    serializer_class = WorkflowJobTemplateSerializer
    parent_model = Organization
    relationship = 'workflows'
    parent_key = 'organization'


class OrganizationTeamsList(SubListCreateAttachDetachAPIView):

    model = Team
    serializer_class = TeamSerializer
    parent_model = Organization
    relationship = 'teams'
    parent_key = 'organization'


class OrganizationActivityStreamList(ActivityStreamEnforcementMixin, SubListAPIView):

    model = ActivityStream
    serializer_class = ActivityStreamSerializer
    parent_model = Organization
    relationship = 'activitystream_set'
    search_fields = ('changes',)


class OrganizationNotificationTemplatesList(SubListCreateAttachDetachAPIView):

    model = NotificationTemplate
    serializer_class = NotificationTemplateSerializer
    parent_model = Organization
    relationship = 'notification_templates'
    parent_key = 'organization'


class OrganizationNotificationTemplatesAnyList(SubListCreateAttachDetachAPIView):

    model = NotificationTemplate
    serializer_class = NotificationTemplateSerializer
    parent_model = Organization
    relationship = 'notification_templates_any'


class OrganizationNotificationTemplatesErrorList(SubListCreateAttachDetachAPIView):

    model = NotificationTemplate
    serializer_class = NotificationTemplateSerializer
    parent_model = Organization
    relationship = 'notification_templates_error'


class OrganizationNotificationTemplatesSuccessList(SubListCreateAttachDetachAPIView):

    model = NotificationTemplate
    serializer_class = NotificationTemplateSerializer
    parent_model = Organization
    relationship = 'notification_templates_success'


class OrganizationInstanceGroupsList(SubListAttachDetachAPIView):

    model = InstanceGroup
    serializer_class = InstanceGroupSerializer
    parent_model = Organization
    relationship = 'instance_groups'


class OrganizationAccessList(ResourceAccessList):

    model = User # needs to be User for AccessLists's
    parent_model = Organization


class OrganizationObjectRolesList(SubListAPIView):

    model = Role
    serializer_class = RoleSerializer
    parent_model = Organization
    search_fields = ('role_field', 'content_type__model',)

    def get_queryset(self):
        po = self.get_parent_object()
        content_type = ContentType.objects.get_for_model(self.parent_model)
        return Role.objects.filter(content_type=content_type, object_id=po.pk)

