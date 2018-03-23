# Copyright (c) 2017 Red Hat, Inc
from django.shortcuts import render
from django import forms
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponse
from awx.network_ui.models import Topology, Device, Link, Interface
from django.db.models import Q
import yaml
import json

NetworkAnnotatedInterface = Interface.objects.values('name',
                                                     'cid',
                                                     'from_link__pk',
                                                     'to_link__pk',
                                                     'from_link__to_device__name',
                                                     'to_link__from_device__name',
                                                     'from_link__to_interface__name',
                                                     'to_link__from_interface__name')


def topology_data(topology_id):

        data = dict(devices=[],
                    links=[])

        topology = Topology.objects.get(pk=topology_id)

        data['name'] = topology.name
        data['topology_id'] = topology_id

        links = list(Link.objects
                         .filter(Q(from_device__topology_id=topology_id) |
                                 Q(to_device__topology_id=topology_id)))

        interfaces = Interface.objects.filter(device__topology_id=topology_id)

        for device in Device.objects.filter(topology_id=topology_id).order_by('name'):
            interfaces = list(NetworkAnnotatedInterface.filter(device_id=device.pk).order_by('name'))
            interfaces = [dict(name=x['name'],
                               network=x['from_link__pk'] or x['to_link__pk'],
                               remote_device_name=x['from_link__to_device__name'] or x['to_link__from_device__name'],
                               remote_interface_name=x['from_link__to_interface__name'] or x['to_link__from_interface__name'],
                               id=x['cid'],
                               ) for x in interfaces]
            data['devices'].append(dict(name=device.name,
                                        type=device.device_type,
                                        x=device.x,
                                        y=device.y,
                                        id=device.cid,
                                        interfaces=interfaces))

        for link in links:
            data['links'].append(dict(from_device=link.from_device.name,
                                      to_device=link.to_device.name,
                                      from_interface=link.from_interface.name,
                                      to_interface=link.to_interface.name,
                                      from_device_id=link.from_device.cid,
                                      to_device_id=link.to_device.cid,
                                      from_interface_id=link.from_interface.cid,
                                      to_interface_id=link.to_interface.cid,
                                      name=link.name,
                                      network=link.pk))

        return data


def yaml_serialize_topology(topology_id):
    return yaml.safe_dump(topology_data(topology_id), default_flow_style=False)


def json_serialize_topology(topology_id):
    return json.dumps(topology_data(topology_id))


def index(request):
    return render(request, "network_ui/index.html", dict(topologies=Topology.objects.all().order_by('-pk')))


class TopologyForm(forms.Form):
    topology_id = forms.IntegerField()


def json_topology_data(request):
    form = TopologyForm(request.GET)
    if form.is_valid():
        return JsonResponse(topology_data(form.cleaned_data['topology_id']))
    else:
        return HttpResponseBadRequest(form.errors)


def yaml_topology_data(request):
    form = TopologyForm(request.GET)
    if form.is_valid():
        return HttpResponse(yaml.safe_dump(topology_data(form.cleaned_data['topology_id']),
                                           default_flow_style=False),
                            content_type='application/yaml')
    else:
        return HttpResponseBadRequest(form.errors)

