package cloud

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"cloudsecops/internal/config"

	"github.com/sirupsen/logrus"
)

// CloudProvider 云提供商类型
type CloudProvider string

const (
	AWS   CloudProvider = "aws"
	Azure CloudProvider = "azure"
)

// ResourceType 资源类型
type ResourceType string

const (
	EC2Instance    ResourceType = "ec2_instance"
	S3Bucket       ResourceType = "s3_bucket"
	IAMRole        ResourceType = "iam_role"
	SecurityGroup  ResourceType = "security_group"
	VirtualMachine ResourceType = "virtual_machine"
	StorageAccount ResourceType = "storage_account"
	ResourceGroup  ResourceType = "resource_group"
	KeyVault       ResourceType = "key_vault"
)

// Resource 云资源结构
type Resource struct {
	ID           string                 `json:"id"`
	Name         string                 `json:"name"`
	Type         ResourceType           `json:"type"`
	Provider     CloudProvider          `json:"provider"`
	Region       string                 `json:"region"`
	Status       string                 `json:"status"`
	Tags         map[string]string      `json:"tags"`
	Metadata     map[string]interface{} `json:"metadata"`
	CreatedAt    time.Time              `json:"created_at"`
	LastModified time.Time              `json:"last_modified"`
	RiskScore    int                    `json:"risk_score"`
	Vulnerabilities []Vulnerability     `json:"vulnerabilities"`
}

// Vulnerability 漏洞信息
type Vulnerability struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Severity    string    `json:"severity"`
	CVSS        float64   `json:"cvss"`
	Remediation string    `json:"remediation"`
	DetectedAt  time.Time `json:"detected_at"`
}

// Context 上下文信息
type Context struct {
	Environment   string            `json:"environment"`
	Project       string            `json:"project"`
	Owner         string            `json:"owner"`
	CostCenter    string            `json:"cost_center"`
	Compliance    []string          `json:"compliance"`
	NetworkConfig NetworkConfig     `json:"network_config"`
	SecurityConfig SecurityConfig   `json:"security_config"`
}

// NetworkConfig 网络配置
type NetworkConfig struct {
	VPCID         string   `json:"vpc_id"`
	SubnetIDs     []string `json:"subnet_ids"`
	SecurityGroups []string `json:"security_groups"`
	PublicAccess  bool     `json:"public_access"`
	InternetGateway bool   `json:"internet_gateway"`
}

// SecurityConfig 安全配置
type SecurityConfig struct {
	EncryptionEnabled bool     `json:"encryption_enabled"`
	AccessLogging     bool     `json:"access_logging"`
	MFARequired       bool     `json:"mfa_required"`
	PasswordPolicy    string   `json:"password_policy"`
	AllowedIPs        []string `json:"allowed_ips"`
}

// Service 云API集成服务
type Service struct {
	config *config.Config
	logger *logrus.Logger
	aws    *AWSClient
	azure  *AzureClient
}

// NewService 创建云API集成服务
func NewService(cfg *config.Config, logger *logrus.Logger) *Service {
	return &Service{
		config: cfg,
		logger: logger,
		aws:    NewAWSClient(cfg.AWS, logger),
		azure:  NewAzureClient(cfg.Azure, logger),
	}
}

// GetResources 获取指定云提供商的资源
func (s *Service) GetResources(ctx context.Context, provider CloudProvider, resourceType ResourceType) ([]Resource, error) {
	s.logger.WithFields(logrus.Fields{
		"provider":      provider,
		"resource_type": resourceType,
	}).Info("获取云资源")

	switch provider {
	case AWS:
		return s.aws.GetResources(ctx, resourceType)
	case Azure:
		return s.azure.GetResources(ctx, resourceType)
	default:
		return nil, fmt.Errorf("不支持的云提供商: %s", provider)
	}
}

// GetAllResources 获取所有云提供商的资源
func (s *Service) GetAllResources(ctx context.Context) (map[CloudProvider][]Resource, error) {
	s.logger.Info("获取所有云资源")

	result := make(map[CloudProvider][]Resource)

	// 获取AWS资源
	if s.config.AWS.AccessKeyID != "" {
		awsResources, err := s.aws.GetAllResources(ctx)
		if err != nil {
			s.logger.WithError(err).Warn("获取AWS资源失败")
		} else {
			result[AWS] = awsResources
		}
	}

	// 获取Azure资源
	if s.config.Azure.ClientID != "" {
		azureResources, err := s.azure.GetAllResources(ctx)
		if err != nil {
			s.logger.WithError(err).Warn("获取Azure资源失败")
		} else {
			result[Azure] = azureResources
		}
	}

	return result, nil
}

// GetResourceContext 获取资源上下文信息
func (s *Service) GetResourceContext(ctx context.Context, provider CloudProvider, resourceID string) (*Context, error) {
	s.logger.WithFields(logrus.Fields{
		"provider":    provider,
		"resource_id": resourceID,
	}).Info("获取资源上下文")

	switch provider {
	case AWS:
		return s.aws.GetResourceContext(ctx, resourceID)
	case Azure:
		return s.azure.GetResourceContext(ctx, resourceID)
	default:
		return nil, fmt.Errorf("不支持的云提供商: %s", provider)
	}
}

// SyncResources 同步云资源
func (s *Service) SyncResources(ctx context.Context) error {
	s.logger.Info("开始同步云资源")

	// 同步AWS资源
	if s.config.AWS.AccessKeyID != "" {
		if err := s.aws.SyncResources(ctx); err != nil {
			s.logger.WithError(err).Error("同步AWS资源失败")
			return fmt.Errorf("同步AWS资源失败: %w", err)
		}
	}

	// 同步Azure资源
	if s.config.Azure.ClientID != "" {
		if err := s.azure.SyncResources(ctx); err != nil {
			s.logger.WithError(err).Error("同步Azure资源失败")
			return fmt.Errorf("同步Azure资源失败: %w", err)
		}
	}

	s.logger.Info("云资源同步完成")
	return nil
}

// AnalyzeSecurityPosture 分析安全态势
func (s *Service) AnalyzeSecurityPosture(ctx context.Context) (map[string]interface{}, error) {
	s.logger.Info("分析云安全态势")

	allResources, err := s.GetAllResources(ctx)
	if err != nil {
		return nil, fmt.Errorf("获取资源失败: %w", err)
	}

	analysis := map[string]interface{}{
		"total_resources": 0,
		"high_risk_resources": 0,
		"vulnerabilities": make(map[string]int),
		"compliance_status": make(map[string]bool),
		"recommendations": []string{},
	}

	vulnCounts := make(map[string]int)
	totalResources := 0
	highRiskResources := 0

	for provider, resources := range allResources {
		for _, resource := range resources {
			totalResources++
			if resource.RiskScore >= 7 {
				highRiskResources++
			}

			for _, vuln := range resource.Vulnerabilities {
				vulnCounts[vuln.Severity]++
			}
		}

		s.logger.WithFields(logrus.Fields{
			"provider": provider,
			"count":    len(resources),
		}).Info("分析云提供商资源")
	}

	analysis["total_resources"] = totalResources
	analysis["high_risk_resources"] = highRiskResources
	analysis["vulnerabilities"] = vulnCounts

	// 生成建议
	recommendations := []string{}
	if highRiskResources > 0 {
		recommendations = append(recommendations, fmt.Sprintf("发现 %d 个高风险资源，建议立即处理", highRiskResources))
	}
	if vulnCounts["critical"] > 0 {
		recommendations = append(recommendations, fmt.Sprintf("发现 %d 个严重漏洞，需要紧急修复", vulnCounts["critical"]))
	}
	if vulnCounts["high"] > 0 {
		recommendations = append(recommendations, fmt.Sprintf("发现 %d 个高危漏洞，建议优先修复", vulnCounts["high"]))
	}

	analysis["recommendations"] = recommendations

	return analysis, nil
}

// GetResourcesByTag 根据标签获取资源
func (s *Service) GetResourcesByTag(ctx context.Context, provider CloudProvider, tagKey, tagValue string) ([]Resource, error) {
	s.logger.WithFields(logrus.Fields{
		"provider":  provider,
		"tag_key":   tagKey,
		"tag_value": tagValue,
	}).Info("根据标签获取资源")

	allResources, err := s.GetAllResources(ctx)
	if err != nil {
		return nil, err
	}

	var filteredResources []Resource
	for _, resource := range allResources[provider] {
		if value, exists := resource.Tags[tagKey]; exists && value == tagValue {
			filteredResources = append(filteredResources, resource)
		}
	}

	return filteredResources, nil
}

// ExportResources 导出资源信息
func (s *Service) ExportResources(ctx context.Context, format string) ([]byte, error) {
	s.logger.WithField("format", format).Info("导出资源信息")

	allResources, err := s.GetAllResources(ctx)
	if err != nil {
		return nil, err
	}

	switch format {
	case "json":
		return json.MarshalIndent(allResources, "", "  ")
	default:
		return nil, fmt.Errorf("不支持的导出格式: %s", format)
	}
}