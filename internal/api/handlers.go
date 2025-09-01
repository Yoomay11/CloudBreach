package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"cloudsecops/internal/attack"
	"cloudsecops/internal/cloud"
	"cloudsecops/internal/iac"
	"cloudsecops/internal/remediation"
	"cloudsecops/pkg/auth"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// 认证相关处理器

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// loginHandler 登录处理器
func loginHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 简单的用户验证（实际应用中应该查询数据库）
		if req.Username != "admin" || req.Password != "password" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		// 生成JWT令牌
		token, err := deps.Auth.GenerateToken("1", req.Username, []string{"admin"}, 24*time.Hour)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, LoginResponse{
			Token:     token,
			ExpiresIn: 86400, // 24小时
		})
	}
}

// refreshTokenHandler 刷新令牌处理器
func refreshTokenHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"message": "Not implemented yet"})
	}
}

// 中间件

// authMiddleware JWT认证中间件
func authMiddleware(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("roles", claims.Roles)
		c.Next()
	}
}

// IaC扫描处理器

// ScanRequest 扫描请求
type ScanRequest struct {
	Path     string `json:"path" binding:"required"`
	ScanType string `json:"scan_type"` // "file" or "directory"
}

// iacScanHandler IaC扫描处理器
func iacScanHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ScanRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 创建扫描器
		scanner := iac.NewScanner()

		var result *iac.ScanResult
		var err error

		// 根据扫描类型执行扫描
		if req.ScanType == "directory" {
			result, err = scanner.ScanDirectory(req.Path)
		} else {
			// 检查文件是否存在
			if _, statErr := os.Stat(req.Path); os.IsNotExist(statErr) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "File not found"})
				return
			}
			result, err = scanner.ScanFile(req.Path)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// getScanResultHandler 获取扫描结果处理器
func getScanResultHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		scanID := c.Param("id")
		if scanID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Scan ID is required"})
			return
		}

		// TODO: 从数据库获取扫描结果
		// 这里返回模拟数据
		c.JSON(http.StatusOK, gin.H{
			"id":        scanID,
			"status":    "completed",
			"timestamp": time.Now(),
			"findings":  []interface{}{},
		})
	}
}

// listScansHandler 列出扫描处理器
func listScansHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取查询参数
		limit := 10
		if l := c.Query("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil {
				limit = parsed
			}
		}

		offset := 0
		if o := c.Query("offset"); o != "" {
			if parsed, err := strconv.Atoi(o); err == nil {
				offset = parsed
			}
		}

		// TODO: 从数据库获取扫描历史
		// 这里返回模拟数据
		scans := []gin.H{
			{
				"id":         "scan_001",
				"path":       "/path/to/config",
				"type":       "terraform",
				"status":     "completed",
				"timestamp":  time.Now().Add(-time.Hour),
				"findings":   15,
				"critical":   2,
				"high":       5,
				"medium":     6,
				"low":        2,
			},
			{
				"id":         "scan_002",
				"path":       "/path/to/k8s",
				"type":       "kubernetes",
				"status":     "completed",
				"timestamp":  time.Now().Add(-2*time.Hour),
				"findings":   8,
				"critical":   1,
				"high":       3,
				"medium":     3,
				"low":        1,
			},
		}

		c.JSON(http.StatusOK, gin.H{
			"scans":  scans,
			"total":  len(scans),
			"limit":  limit,
			"offset": offset,
		})
	}
}

// uploadConfigHandler 上传配置文件
func uploadConfigHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
			return
		}
		defer file.Close()

		// 检查文件类型
		filename := header.Filename
		ext := filepath.Ext(filename)
		if ext != ".tf" && ext != ".yaml" && ext != ".yml" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported file type"})
			return
		}

		// 创建临时文件
		tempDir := "/tmp/cloudsecops-uploads"
		os.MkdirAll(tempDir, 0755)
		tempFile := filepath.Join(tempDir, fmt.Sprintf("%d_%s", time.Now().Unix(), filename))

		// 保存文件
		out, err := os.Create(tempFile)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
			return
		}
		defer out.Close()

		// 复制文件内容
		if _, err := file.Seek(0, 0); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
			return
		}

		buf := make([]byte, 1024)
		for {
			n, err := file.Read(buf)
			if n > 0 {
				out.Write(buf[:n])
			}
			if err != nil {
				break
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "File uploaded successfully",
			"filename": filename,
			"path":     tempFile,
		})
	}
}

// eBPF监控处理器

// monitorStatusHandler 监控状态处理器
func monitorStatusHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "running",
			"running": deps.EBPFMonitor.IsRunning(),
		})
	}
}

// getEventsHandler 获取事件处理器
func getEventsHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		limitStr := c.DefaultQuery("limit", "100")
		limit, _ := strconv.Atoi(limitStr)
		
		events := []gin.H{}
		for i := 0; i < limit && i < 10; i++ {
			events = append(events, gin.H{
				"id":        i + 1,
				"timestamp": time.Now().Unix(),
				"type":      "syscall",
				"severity":  "medium",
			})
		}
		
		c.JSON(http.StatusOK, gin.H{"events": events})
	}
}

// streamEventsHandler 事件流处理器
func streamEventsHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"message": "WebSocket streaming not implemented yet"})
	}
}

// 攻击链分析处理器

// analyzeAttackChainHandler 分析攻击链处理器
func analyzeAttackChainHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request struct {
			Name string `json:"name"`
			Type string `json:"type"` // full, quick, targeted
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		if request.Name == "" {
			request.Name = fmt.Sprintf("攻击链分析 %s", time.Now().Format("15:04:05"))
		}

		// 创建攻击链分析器
		analyzer := attack.NewChainAnalyzer(deps.Logger)
		analyzer.LoadSampleData()

		// 执行分析
		chain := analyzer.AnalyzeChain(request.Name)
		if chain == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze attack chain"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":     "Attack chain analysis completed",
			"analysis_id": chain.ID,
			"chain":       chain,
		})
	}
}

// getAttackChainHandler 获取攻击链处理器
func getAttackChainHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		chainID := c.Param("id")
		
		// 创建分析器并加载数据
		analyzer := attack.NewChainAnalyzer(deps.Logger)
		analyzer.LoadSampleData()
		
		// 生成示例攻击链
		chain := analyzer.AnalyzeChain("示例攻击链")
		if chain == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Attack chain not found"})
			return
		}
		
		// 设置正确的ID
		chain.ID = chainID
		c.JSON(http.StatusOK, chain)
	}
}

// listAttackChainsHandler 列出攻击链处理器
func listAttackChainsHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 创建分析器并加载示例数据
		analyzer := attack.NewChainAnalyzer(deps.Logger)
		analyzer.LoadSampleData()
		
		// 生成示例攻击链列表
		chains := []gin.H{
			{
				"id":          "chain_001",
				"name":        "云环境横向移动攻击链",
				"severity":    "high",
				"status":      "active",
				"created_at":  time.Now().Add(-2*time.Hour),
				"steps_count": 5,
			},
			{
				"id":          "chain_002",
				"name":        "权限提升攻击链",
				"severity":    "critical",
				"status":      "completed",
				"created_at":  time.Now().Add(-4*time.Hour),
				"steps_count": 3,
			},
		}
		
		c.JSON(http.StatusOK, gin.H{
			"chains": chains,
			"total":  len(chains),
		})
	}
}

// 修复建议处理器

// generateRemediationHandler 生成修复建议处理器
func generateRemediationHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request struct {
			VulnID     string            `json:"vuln_id"`
			VulnType   string            `json:"vuln_type"`
			Severity   string            `json:"severity"`
			FilePath   string            `json:"file_path"`
			LineNumber int               `json:"line_number,omitempty"`
			Context    map[string]string `json:"context,omitempty"`
			AutoApply  bool              `json:"auto_apply,omitempty"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		// 创建修复建议服务
		remediationService := remediation.NewService(deps.Logger)

		// 生成修复建议
		req := remediation.RemediationRequest{
			VulnID:     request.VulnID,
			VulnType:   request.VulnType,
			Severity:   request.Severity,
			FilePath:   request.FilePath,
			LineNumber: request.LineNumber,
			Context:    request.Context,
			AutoApply:  request.AutoApply,
		}

		response, err := remediationService.GenerateSuggestions(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate suggestions"})
			return
		}

		c.JSON(http.StatusOK, response)
	}
}

// applyRemediationHandler 应用修复建议处理器
func applyRemediationHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request struct {
			SuggestionID string `json:"suggestion_id"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		// 创建修复建议服务
		remediationService := remediation.NewService(deps.Logger)

		// 应用修复建议
		response, err := remediationService.ApplySuggestion(request.SuggestionID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply suggestion"})
			return
		}

		c.JSON(http.StatusOK, response)
	}
}

// getRemediationHandler 获取修复建议处理器
func getRemediationHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		suggestionID := c.Param("id")

		// 创建修复建议服务
		remediationService := remediation.NewService(deps.Logger)

		// 获取修复建议详情
		suggestion, err := remediationService.GetSuggestion(suggestionID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Suggestion not found"})
			return
		}

		c.JSON(http.StatusOK, suggestion)
	}
}

// listRemediationsHandler 列出修复建议处理器
func listRemediationsHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 创建修复建议服务
		remediationService := remediation.NewService(deps.Logger)

		// 获取所有修复建议
		suggestions, err := remediationService.ListSuggestions()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve suggestions"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"suggestions": suggestions,
			"total":       len(suggestions),
		})
	}
}

// 云API集成处理器

// getAWSResourcesHandler 获取AWS资源处理器
func getAWSResourcesHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		resourceType := c.Query("type")

		// 创建云服务
		cloudService := cloud.NewService(deps.Config, deps.Logger)

		if resourceType != "" {
			// 获取特定类型的资源
			resources, err := cloudService.GetResources(ctx, cloud.AWS, cloud.ResourceType(resourceType))
			if err != nil {
				deps.Logger.WithError(err).Error("获取AWS资源失败")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "获取AWS资源失败"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"resources": resources})
		} else {
			// 获取所有AWS资源
			allResources, err := cloudService.GetAllResources(ctx)
			if err != nil {
				deps.Logger.WithError(err).Error("获取所有云资源失败")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "获取云资源失败"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"resources": allResources[cloud.AWS]})
		}
	}
}

// getAzureResourcesHandler 获取Azure资源处理器
func getAzureResourcesHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		resourceType := c.Query("type")

		// 创建云服务
		cloudService := cloud.NewService(deps.Config, deps.Logger)

		if resourceType != "" {
			// 获取特定类型的资源
			resources, err := cloudService.GetResources(ctx, cloud.Azure, cloud.ResourceType(resourceType))
			if err != nil {
				deps.Logger.WithError(err).Error("获取Azure资源失败")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "获取Azure资源失败"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"resources": resources})
		} else {
			// 获取所有Azure资源
			allResources, err := cloudService.GetAllResources(ctx)
			if err != nil {
				deps.Logger.WithError(err).Error("获取所有云资源失败")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "获取云资源失败"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"resources": allResources[cloud.Azure]})
		}
	}
}

// syncCloudResourcesHandler 同步云资源处理器
func syncCloudResourcesHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// 创建云服务
		cloudService := cloud.NewService(deps.Config, deps.Logger)

		// 同步云资源
		if err := cloudService.SyncResources(ctx); err != nil {
			deps.Logger.WithError(err).Error("同步云资源失败")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "同步云资源失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "云资源同步完成"})
	}
}

// getResourceContextHandler 获取资源上下文处理器
func getResourceContextHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		resourceID := c.Param("id")
		provider := c.DefaultQuery("provider", "aws")

		if resourceID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "资源ID不能为空"})
			return
		}

		// 创建云服务
		cloudService := cloud.NewService(deps.Config, deps.Logger)

		// 解析云提供商
		var cloudProvider cloud.CloudProvider
		switch provider {
		case "aws":
			cloudProvider = cloud.AWS
		case "azure":
			cloudProvider = cloud.Azure
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的云提供商"})
			return
		}

		// 获取资源上下文
		context, err := cloudService.GetResourceContext(ctx, cloudProvider, resourceID)
		if err != nil {
			deps.Logger.WithError(err).Error("获取资源上下文失败")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取资源上下文失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"context": context})
	}
}

// getSecurityPostureHandler 获取安全态势处理器
func getSecurityPostureHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// 创建云服务
		cloudService := cloud.NewService(deps.Config, deps.Logger)

		// 分析安全态势
		posture, err := cloudService.AnalyzeSecurityPosture(ctx)
		if err != nil {
			deps.Logger.WithError(err).Error("分析安全态势失败")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "分析安全态势失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"posture": posture})
	}
}

// exportResourcesHandler 导出资源处理器
func exportResourcesHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		format := c.DefaultQuery("format", "json")

		// 创建云服务
		cloudService := cloud.NewService(deps.Config, deps.Logger)

		// 导出资源
		data, err := cloudService.ExportResources(ctx, format)
		if err != nil {
			deps.Logger.WithError(err).Error("导出资源失败")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "导出资源失败"})
			return
		}

		// 设置响应头
		filename := fmt.Sprintf("cloud-resources-%d.%s", time.Now().Unix(), format)
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Type", "application/octet-stream")
		c.Data(http.StatusOK, "application/octet-stream", data)
	}
}

// 报告和可视化处理器

// getDashboardDataHandler 获取仪表盘数据处理器
func getDashboardDataHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"total_scans":      42,
			"active_monitors":  3,
			"critical_alerts": 5,
			"recent_events":   []gin.H{},
		})
	}
}

// exportReportHandler 导出报告处理器
func exportReportHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		reportID := c.Param("id")
		c.JSON(http.StatusOK, gin.H{"report_id": reportID, "download_url": "/downloads/report.pdf"})
	}
}

// getMetricsHandler 获取指标处理器
func getMetricsHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"metrics": gin.H{}})
	}
}

// WebSocket处理器

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 在生产环境中应该检查来源
	},
}

// websocketHandler WebSocket处理器
func websocketHandler(deps *Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
			return
		}
		defer conn.Close()

		// 简单的WebSocket回显
		for {
			messageType, message, err := conn.ReadMessage()
			if err != nil {
				break
			}
			if err := conn.WriteMessage(messageType, message); err != nil {
				break
			}
		}
	}
}