package api

import (
	"database/sql"
	"net/http"

	"cloudsecops/internal/config"
	"cloudsecops/internal/ebpf"
	"cloudsecops/pkg/auth"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
)

// Dependencies API依赖项
type Dependencies struct {
	DB          *sql.DB
	Redis       *redis.Client
	Auth        *auth.Service
	EBPFMonitor *ebpf.Monitor
	Config      *config.Config
	Logger      *logrus.Logger
}

// SetupRoutes 设置API路由
func SetupRoutes(router *gin.Engine, deps *Dependencies) {
	// 健康检查
	router.GET("/health", healthCheck)

	// API版本组
	v1 := router.Group("/api/v1")
	{
		// 认证相关
		auth := v1.Group("/auth")
		{
			auth.POST("/login", loginHandler(deps))
			auth.POST("/refresh", refreshTokenHandler(deps))
		}

		// 需要认证的路由
		protected := v1.Group("/")
		protected.Use(authMiddleware(deps.Auth))
		{
			// IaC扫描
			iac := protected.Group("/iac")
			{
				iac.POST("/scan", iacScanHandler(deps))
				iac.GET("/scan/:id", getScanResultHandler(deps))
				iac.GET("/scans", listScansHandler(deps))
				iac.POST("/upload", uploadConfigHandler(deps))
			}

			// eBPF监控
			monitor := protected.Group("/monitor")
			{
				monitor.GET("/status", monitorStatusHandler(deps))
				monitor.GET("/events", getEventsHandler(deps))
				monitor.GET("/events/stream", streamEventsHandler(deps))
			}

			// 攻击链分析
			attack := protected.Group("/attack")
			{
				attack.POST("/analyze", analyzeAttackChainHandler(deps))
				attack.GET("/chain/:id", getAttackChainHandler(deps))
				attack.GET("/chains", listAttackChainsHandler(deps))
			}

			// 修复建议
			remediation := protected.Group("/remediation")
			{
				remediation.POST("/generate", generateRemediationHandler(deps))
				remediation.POST("/apply", applyRemediationHandler(deps))
				remediation.GET("/suggestions/:id", getRemediationHandler(deps))
				remediation.GET("/suggestions", listRemediationsHandler(deps))
			}

			// 云API集成
			cloud := protected.Group("/cloud")
			{
				cloud.GET("/aws/resources", getAWSResourcesHandler(deps))
				cloud.GET("/azure/resources", getAzureResourcesHandler(deps))
				cloud.POST("/sync", syncCloudResourcesHandler(deps))
				cloud.GET("/resources/context/:id", getResourceContextHandler(deps))
				cloud.GET("/security/posture", getSecurityPostureHandler(deps))
				cloud.GET("/resources/export", exportResourcesHandler(deps))
			}

			// 报告和可视化
			reports := protected.Group("/reports")
			{
				reports.GET("/dashboard", getDashboardDataHandler(deps))
				reports.GET("/export/:id", exportReportHandler(deps))
				reports.GET("/metrics", getMetricsHandler(deps))
			}
		}
	}

	// WebSocket端点
	router.GET("/ws", websocketHandler(deps))
}

// healthCheck 健康检查处理器
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": gin.H{"unix": gin.H{"seconds": 1234567890}},
		"service":   "cloudsecops",
		"version":   "1.0.0",
	})
}