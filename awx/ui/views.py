# Copyright (c) 2015 Ansible, Inc.
# All Rights Reserved.

from django.views.generic.base import TemplateView, RedirectView

class IndexView(TemplateView):

    template_name = 'ui/index.html'

    def get_context_data(self, **kwargs):
        context = super(IndexView, self).get_context_data(**kwargs)
        # Add any additional context info here.
        return context

index = IndexView.as_view()

class PortalRedirectView(RedirectView):

    permanent = True
    url = '/#/portal'

portal_redirect = PortalRedirectView.as_view()

class MigrationsNotran(TemplateView):

    template_name = 'ui/installing.html'

migrations_notran = MigrationsNotran.as_view()
