package iac

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hashicorp/hcl/v2/hclparse"
)

// ScanResult 扫描结果
type ScanResult struct {
	ID          string      `json:"id"`
	Timestamp   time.Time   `json:"timestamp"`
	FilePath    string      `json:"file_path"`
	FileType    string      `json:"file_type"`
	Findings    []Finding   `json:"findings"`
	Summary     Summary     `json:"summary"`
	Status      string      `json:"status"`
}

// Finding 发现的问题
type Finding struct {
	ID          string            `json:"id"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Severity    string            `json:"severity"`
	Category    string            `json:"category"`
	Line        int               `json:"line"`
	Column      int               `json:"column"`
	Resource    string            `json:"resource"`
	Rule        string            `json:"rule"`
	CVSS        float64           `json:"cvss"`
	References  []string          `json:"references"`
	Metadata    map[string]string `json:"metadata"`
}

// Summary 扫描摘要
type Summary struct {
	TotalFiles    int `json:"total_files"`
	TotalFindings int `json:"total_findings"`
	Critical      int `json:"critical"`
	High          int `json:"high"`
	Medium        int `json:"medium"`
	Low           int `json:"low"`
	Info          int `json:"info"`
}

// Scanner IaC扫描器
type Scanner struct {
	rules []Rule
}

// Rule 扫描规则
type Rule struct {
	ID          string
	Title       string
	Description string
	Severity    string
	Category    string
	FileTypes   []string
	Check       func(content string, filePath string) []Finding
}

// NewScanner 创建新的扫描器
func NewScanner() *Scanner {
	return &Scanner{
		rules: getDefaultRules(),
	}
}

// ScanDirectory 扫描目录
func (s *Scanner) ScanDirectory(dirPath string) (*ScanResult, error) {
	result := &ScanResult{
		ID:        fmt.Sprintf("scan_%d", time.Now().Unix()),
		Timestamp: time.Now(),
		FilePath:  dirPath,
		FileType:  "directory",
		Findings:  []Finding{},
		Status:    "running",
	}

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		// 检查文件类型
		fileType := getFileType(path)
		if fileType == "unknown" {
			return nil
		}

		// 扫描文件
		findings, err := s.scanFile(path, fileType)
		if err != nil {
			return err
		}

		result.Findings = append(result.Findings, findings...)
		return nil
	})

	if err != nil {
		return nil, err
	}

	// 生成摘要
	result.Summary = s.generateSummary(result.Findings)
	result.Status = "completed"

	return result, nil
}

// ScanFile 扫描单个文件
func (s *Scanner) ScanFile(filePath string) (*ScanResult, error) {
	fileType := getFileType(filePath)
	if fileType == "unknown" {
		return nil, fmt.Errorf("unsupported file type: %s", filePath)
	}

	findings, err := s.scanFile(filePath, fileType)
	if err != nil {
		return nil, err
	}

	result := &ScanResult{
		ID:        fmt.Sprintf("scan_%d", time.Now().Unix()),
		Timestamp: time.Now(),
		FilePath:  filePath,
		FileType:  fileType,
		Findings:  findings,
		Summary:   s.generateSummary(findings),
		Status:    "completed",
	}

	return result, nil
}

// scanFile 扫描文件内容
func (s *Scanner) scanFile(filePath, fileType string) ([]Finding, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var findings []Finding
	contentStr := string(content)

	// 应用规则
	for _, rule := range s.rules {
		// 检查规则是否适用于此文件类型
		if !contains(rule.FileTypes, fileType) {
			continue
		}

		// 执行检查
		ruleFindings := rule.Check(contentStr, filePath)
		findings = append(findings, ruleFindings...)
	}

	return findings, nil
}

// generateSummary 生成扫描摘要
func (s *Scanner) generateSummary(findings []Finding) Summary {
	summary := Summary{
		TotalFindings: len(findings),
	}

	for _, finding := range findings {
		switch finding.Severity {
		case "critical":
			summary.Critical++
		case "high":
			summary.High++
		case "medium":
			summary.Medium++
		case "low":
			summary.Low++
		case "info":
			summary.Info++
		}
	}

	return summary
}

// getFileType 获取文件类型
func getFileType(filePath string) string {
	ext := strings.ToLower(filepath.Ext(filePath))
	baseName := strings.ToLower(filepath.Base(filePath))

	switch {
	case ext == ".tf" || ext == ".hcl":
		return "terraform"
	case ext == ".yaml" || ext == ".yml":
		return "kubernetes"
	case strings.Contains(baseName, "dockerfile"):
		return "dockerfile"
	default:
		return "unknown"
	}
}

// contains 检查切片是否包含元素
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// getDefaultRules 获取默认扫描规则
func getDefaultRules() []Rule {
	return []Rule{
		// Terraform规则
		{
			ID:          "TF001",
			Title:       "AWS IAM Policy Too Permissive",
			Description: "IAM policy allows '*' actions which is overly permissive",
			Severity:    "high",
			Category:    "IAM",
			FileTypes:   []string{"terraform"},
			Check:       checkTerraformIAMWildcard,
		},
		{
			ID:          "TF002",
			Title:       "S3 Bucket Public Read",
			Description: "S3 bucket allows public read access",
			Severity:    "critical",
			Category:    "Storage",
			FileTypes:   []string{"terraform"},
			Check:       checkTerraformS3PublicRead,
		},
		{
			ID:          "TF003",
			Title:       "Security Group Too Open",
			Description: "Security group allows traffic from 0.0.0.0/0",
			Severity:    "high",
			Category:    "Network",
			FileTypes:   []string{"terraform"},
			Check:       checkTerraformSecurityGroup,
		},
		{
			ID:          "TF004",
			Title:       "RDS Instance Not Encrypted",
			Description: "RDS instance does not have encryption enabled",
			Severity:    "medium",
			Category:    "Database",
			FileTypes:   []string{"terraform"},
			Check:       checkTerraformRDSEncryption,
		},
		// Kubernetes规则
		{
			ID:          "K8S001",
			Title:       "Container Running as Root",
			Description: "Container is configured to run as root user",
			Severity:    "medium",
			Category:    "Security",
			FileTypes:   []string{"kubernetes"},
			Check:       checkKubernetesRootUser,
		},
		{
			ID:          "K8S002",
			Title:       "Privileged Container",
			Description: "Container is running in privileged mode",
			Severity:    "critical",
			Category:    "Security",
			FileTypes:   []string{"kubernetes"},
			Check:       checkKubernetesPrivileged,
		},
		{
			ID:          "K8S003",
			Title:       "Missing Resource Limits",
			Description: "Container does not have resource limits defined",
			Severity:    "medium",
			Category:    "Resource Management",
			FileTypes:   []string{"kubernetes"},
			Check:       checkKubernetesResourceLimits,
		},
		{
			ID:          "K8S004",
			Title:       "Host Network Access",
			Description: "Pod has access to host network",
			Severity:    "high",
			Category:    "Network",
			FileTypes:   []string{"kubernetes"},
			Check:       checkKubernetesHostNetwork,
		},
		{
			ID:          "K8S005",
			Title:       "Insecure Capabilities",
			Description: "Container has dangerous capabilities",
			Severity:    "high",
			Category:    "Security",
			FileTypes:   []string{"kubernetes"},
			Check:       checkKubernetesCapabilities,
		},
	}
}

// 规则检查函数

// checkTerraformIAMWildcard 检查Terraform IAM通配符
func checkTerraformIAMWildcard(content, filePath string) []Finding {
	var findings []Finding

	parser := hclparse.NewParser()
	_, diags := parser.ParseHCL([]byte(content), filePath)
	if diags.HasErrors() {
		return findings
	}

	// 简化的检查逻辑
	if strings.Contains(content, `"*"`) && strings.Contains(content, "aws_iam") {
		findings = append(findings, Finding{
			ID:          "TF001_1",
			Title:       "AWS IAM Policy Too Permissive",
			Description: "IAM policy allows '*' actions which is overly permissive",
			Severity:    "high",
			Category:    "IAM",
			Line:        1,
			Resource:    "aws_iam_policy",
			Rule:        "TF001",
			CVSS:        7.5,
		})
	}

	return findings
}

// checkKubernetesRootUser 检查Kubernetes根用户
func checkKubernetesRootUser(content, filePath string) []Finding {
	var findings []Finding

	// 简化的YAML解析
	if strings.Contains(content, "runAsUser: 0") {
		findings = append(findings, Finding{
			ID:          "K8S001_1",
			Title:       "Container Running as Root",
			Description: "Container is configured to run as root user (UID 0)",
			Severity:    "medium",
			Category:    "Security",
			Line:        1,
			Resource:    "Pod/Container",
			Rule:        "K8S001",
			CVSS:        5.0,
		})
	}

	return findings
}

// checkKubernetesPrivileged 检查Kubernetes特权容器
func checkKubernetesPrivileged(content, filePath string) []Finding {
	var findings []Finding

	if strings.Contains(content, "privileged: true") {
		findings = append(findings, Finding{
			ID:          "K8S002_1",
			Title:       "Privileged Container",
			Description: "Container is running in privileged mode, which grants access to all host devices",
			Severity:    "critical",
			Category:    "Security",
			Line:        1,
			Resource:    "Pod/Container",
			Rule:        "K8S002",
			CVSS:        9.0,
		})
	}

	return findings
}

// checkKubernetesResourceLimits 检查Kubernetes资源限制
func checkKubernetesResourceLimits(content, filePath string) []Finding {
	var findings []Finding

	// 检查是否缺少资源限制
	if strings.Contains(content, "kind: Pod") || strings.Contains(content, "kind: Deployment") {
		if !strings.Contains(content, "limits:") {
			findings = append(findings, Finding{
				ID:          "K8S003_1",
				Title:       "Missing Resource Limits",
				Description: "Container does not have CPU/memory limits defined",
				Severity:    "medium",
				Category:    "Resource Management",
				Line:        1,
				Resource:    "Pod/Container",
				Rule:        "K8S003",
				CVSS:        4.0,
			})
		}
	}

	return findings
}

// checkTerraformS3PublicRead 检查S3公共读取权限
func checkTerraformS3PublicRead(content, filePath string) []Finding {
	var findings []Finding

	// 检查S3 bucket公共读取配置
	if strings.Contains(content, "aws_s3_bucket") {
		if strings.Contains(content, `"public-read"`) || strings.Contains(content, `"public-read-write"`) {
			findings = append(findings, Finding{
				ID:          "TF002_1",
				Title:       "S3 Bucket Public Read",
				Description: "S3 bucket allows public read access which may expose sensitive data",
				Severity:    "critical",
				Category:    "Storage",
				Line:        1,
				Resource:    "aws_s3_bucket",
				Rule:        "TF002",
				CVSS:        8.5,
			})
		}
	}

	return findings
}

// checkTerraformSecurityGroup 检查安全组配置
func checkTerraformSecurityGroup(content, filePath string) []Finding {
	var findings []Finding

	// 检查安全组是否允许0.0.0.0/0访问
	if strings.Contains(content, "aws_security_group") {
		if strings.Contains(content, "0.0.0.0/0") {
			findings = append(findings, Finding{
				ID:          "TF003_1",
				Title:       "Security Group Too Open",
				Description: "Security group allows traffic from 0.0.0.0/0 which exposes services to the internet",
				Severity:    "high",
				Category:    "Network",
				Line:        1,
				Resource:    "aws_security_group",
				Rule:        "TF003",
				CVSS:        7.0,
			})
		}
	}

	return findings
}

// checkTerraformRDSEncryption 检查RDS加密
func checkTerraformRDSEncryption(content, filePath string) []Finding {
	var findings []Finding

	// 检查RDS实例是否启用加密
	if strings.Contains(content, "aws_db_instance") {
		if !strings.Contains(content, "storage_encrypted = true") {
			findings = append(findings, Finding{
				ID:          "TF004_1",
				Title:       "RDS Instance Not Encrypted",
				Description: "RDS instance does not have encryption enabled for data at rest",
				Severity:    "medium",
				Category:    "Database",
				Line:        1,
				Resource:    "aws_db_instance",
				Rule:        "TF004",
				CVSS:        5.5,
			})
		}
	}

	return findings
}

// checkKubernetesHostNetwork 检查主机网络访问
func checkKubernetesHostNetwork(content, filePath string) []Finding {
	var findings []Finding

	// 检查是否使用主机网络
	if strings.Contains(content, "hostNetwork: true") {
		findings = append(findings, Finding{
			ID:          "K8S004_1",
			Title:       "Host Network Access",
			Description: "Pod has access to host network which may expose host services",
			Severity:    "high",
			Category:    "Network",
			Line:        1,
			Resource:    "Pod",
			Rule:        "K8S004",
			CVSS:        7.5,
		})
	}

	return findings
}

// checkKubernetesCapabilities 检查危险的容器能力
func checkKubernetesCapabilities(content, filePath string) []Finding {
	var findings []Finding

	// 检查危险的capabilities
	dangerousCaps := []string{"SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE", "SYS_MODULE"}
	for _, cap := range dangerousCaps {
		if strings.Contains(content, cap) {
			findings = append(findings, Finding{
				ID:          "K8S005_1",
				Title:       "Insecure Capabilities",
				Description: fmt.Sprintf("Container has dangerous capability: %s", cap),
				Severity:    "high",
				Category:    "Security",
				Line:        1,
				Resource:    "Container",
				Rule:        "K8S005",
				CVSS:        7.0,
			})
			break
		}
	}

	return findings
}