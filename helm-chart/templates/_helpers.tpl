{{/*
Expand the name of the chart.
*/}}
{{- define "cloudsecops.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "cloudsecops.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "cloudsecops.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "cloudsecops.labels" -}}
helm.sh/chart: {{ include "cloudsecops.chart" . }}
{{ include "cloudsecops.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "cloudsecops.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cloudsecops.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "cloudsecops.serviceAccountName" -}}
{{- if .Values.security.serviceAccount.create }}
{{- default (include "cloudsecops.fullname" .) .Values.security.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.security.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL fullname
*/}}
{{- define "cloudsecops.postgresql.fullname" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "cloudsecops.fullname" .) }}
{{- else }}
{{- .Values.externalDatabase.host }}
{{- end }}
{{- end }}

{{/*
PostgreSQL secret name
*/}}
{{- define "cloudsecops.postgresql.secretName" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "cloudsecops.fullname" .) }}
{{- else }}
{{- printf "%s-external-db" (include "cloudsecops.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Redis fullname
*/}}
{{- define "cloudsecops.redis.fullname" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis" (include "cloudsecops.fullname" .) }}
{{- else }}
{{- .Values.externalRedis.host }}
{{- end }}
{{- end }}

{{/*
Redis secret name
*/}}
{{- define "cloudsecops.redis.secretName" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis" (include "cloudsecops.fullname" .) }}
{{- else }}
{{- printf "%s-external-redis" (include "cloudsecops.fullname" .) }}
{{- end }}
{{- end }}