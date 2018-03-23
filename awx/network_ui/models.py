from django.db import models


class Device(models.Model):

    device_id = models.AutoField(primary_key=True,)
    topology = models.ForeignKey('Topology',)
    name = models.CharField(max_length=200,)
    x = models.IntegerField()
    y = models.IntegerField()
    id = models.IntegerField()
    type = models.CharField(max_length=200,)
    interface_id_seq = models.IntegerField(default=0)

    def __unicode__(self):
        return self.name


class Link(models.Model):

    link_id = models.AutoField(primary_key=True,)
    from_device = models.ForeignKey('Device', related_name='from_link',)
    to_device = models.ForeignKey('Device', related_name='to_link',)
    from_interface = models.ForeignKey('Interface', related_name='from_link',)
    to_interface = models.ForeignKey('Interface', related_name='to_link',)
    id = models.IntegerField()
    name = models.CharField(max_length=200,)


class Topology(models.Model):

    topology_id = models.AutoField(primary_key=True,)
    name = models.CharField(max_length=200,)
    scale = models.FloatField()
    panX = models.FloatField()
    panY = models.FloatField()
    device_id_seq = models.IntegerField('Topology', default=0)
    link_id_seq = models.IntegerField(default=0)
    group_id_seq = models.IntegerField(default=0)

    def __unicode__(self):
        return self.name


class Client(models.Model):

    client_id = models.AutoField(primary_key=True,)


class TopologyHistory(models.Model):

    topology_history_id = models.AutoField(primary_key=True,)
    topology = models.ForeignKey('Topology',)
    client = models.ForeignKey('Client',)
    message_type = models.ForeignKey('MessageType',)
    message_id = models.IntegerField()
    message_data = models.TextField()
    undone = models.BooleanField(default=False)


class MessageType(models.Model):

    message_type_id = models.AutoField(primary_key=True,)
    name = models.CharField(max_length=200,)

    def __unicode__(self):
        return self.name


class Interface(models.Model):

    interface_id = models.AutoField(primary_key=True,)
    device = models.ForeignKey('Device',)
    name = models.CharField(max_length=200,)
    id = models.IntegerField()

    def __unicode__(self):
        return self.name


class Group(models.Model):

    group_id = models.AutoField(primary_key=True,)
    id = models.IntegerField('Group',)
    name = models.CharField(max_length=200,)
    x1 = models.IntegerField()
    y1 = models.IntegerField('Group',)
    x2 = models.IntegerField('Group',)
    y2 = models.IntegerField()
    topology = models.ForeignKey('Topology',)


class GroupDevice(models.Model):

    group_device_id = models.AutoField(primary_key=True,)
    group = models.ForeignKey('Group',)
    device = models.ForeignKey('Device',)
