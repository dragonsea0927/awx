from datetime import date
from unittest import mock

import pytest

from django.contrib.sessions.middleware import SessionMiddleware

from awx.main.models import User
from awx.api.versioning import reverse


#
# user creation
#

EXAMPLE_USER_DATA = {"username": "affable", "first_name": "a", "last_name": "a", "email": "a@a.com", "is_superuser": False, "password": "r$TyKiOCb#ED"}


@pytest.mark.django_db
def test_user_create(post, admin):
    response = post(reverse('api:user_list'), EXAMPLE_USER_DATA, admin, middleware=SessionMiddleware(mock.Mock()))
    assert response.status_code == 201
    assert not response.data['is_superuser']
    assert not response.data['is_system_auditor']


@pytest.mark.django_db
def test_fail_double_create_user(post, admin):
    response = post(reverse('api:user_list'), EXAMPLE_USER_DATA, admin, middleware=SessionMiddleware(mock.Mock()))
    assert response.status_code == 201

    response = post(reverse('api:user_list'), EXAMPLE_USER_DATA, admin, middleware=SessionMiddleware(mock.Mock()))
    assert response.status_code == 400


@pytest.mark.django_db
def test_creating_user_retains_session(post, admin):
    '''
    Creating a new user should not refresh a new session id for the current user.
    '''
    with mock.patch('awx.api.serializers.update_session_auth_hash') as update_session_auth_hash:
        response = post(reverse('api:user_list'), EXAMPLE_USER_DATA, admin)
        assert response.status_code == 201
        assert not update_session_auth_hash.called


@pytest.mark.django_db
def test_updating_own_password_refreshes_session(patch, admin):
    '''
    Updating your own password should refresh the session id.
    '''
    with mock.patch('awx.api.serializers.update_session_auth_hash') as update_session_auth_hash:
        patch(reverse('api:user_detail', kwargs={'pk': admin.pk}), {'password': 'newpassword'}, admin, middleware=SessionMiddleware(mock.Mock()))
        assert update_session_auth_hash.called


@pytest.mark.django_db
def test_create_delete_create_user(post, delete, admin):
    response = post(reverse('api:user_list'), EXAMPLE_USER_DATA, admin, middleware=SessionMiddleware(mock.Mock()))
    assert response.status_code == 201

    response = delete(reverse('api:user_detail', kwargs={'pk': response.data['id']}), admin, middleware=SessionMiddleware(mock.Mock()))
    assert response.status_code == 204

    response = post(reverse('api:user_list'), EXAMPLE_USER_DATA, admin, middleware=SessionMiddleware(mock.Mock()))
    print(response.data)
    assert response.status_code == 201


@pytest.mark.django_db
def test_user_cannot_update_last_login(patch, admin):
    assert admin.last_login is None
    patch(reverse('api:user_detail', kwargs={'pk': admin.pk}), {'last_login': '2020-03-13T16:39:47.303016Z'}, admin, middleware=SessionMiddleware(mock.Mock()))
    assert User.objects.get(pk=admin.pk).last_login is None


@pytest.mark.django_db
def test_user_verify_attribute_created(admin, get):
    assert admin.created == admin.date_joined
    resp = get(reverse('api:user_detail', kwargs={'pk': admin.pk}), admin)
    assert resp.data['created'] == admin.date_joined

    past = date(2020, 1, 1).isoformat()
    for op, count in (('gt', 1), ('lt', 0)):
        resp = get(reverse('api:user_list') + f'?created__{op}={past}', admin)
        assert resp.data['count'] == count
