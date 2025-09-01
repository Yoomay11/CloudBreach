package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cloudsecops/internal/api"
	"cloudsecops/internal/config"
	"cloudsecops/internal/database"
	"cloudsecops/internal/ebpf"
	"cloudsecops/internal/logger"
	"cloudsecops/pkg/auth"

	"github.com/gin-gonic/gin"
)

// @title CloudBreach API
// @version 1.0
// @description 自动化渗透测试平台API
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

func main() {
	// 初始化日志
	logger.Init()
	log := logger.GetLogger()

	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化数据库
	db, err := database.Init(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// 初始化Redis
	redisClient, err := database.InitRedis(cfg.Redis)
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}
	defer redisClient.Close()

	// 初始化JWT认证
	authService := auth.NewService(cfg.JWT.Secret)

	// 初始化eBPF监控器
	ebpfMonitor, err := ebpf.NewMonitor()
	if err != nil {
		log.Fatalf("Failed to initialize eBPF monitor: %v", err)
	}
	defer ebpfMonitor.Close()

	// 启动eBPF监控
	go func() {
		if err := ebpfMonitor.Start(); err != nil {
			log.Errorf("eBPF monitor error: %v", err)
		}
	}()

	// 设置Gin模式
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由器
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// 设置API路由
	api.SetupRoutes(router, &api.Dependencies{
		DB:          db,
		Redis:       redisClient,
		Auth:        authService,
		EBPFMonitor: ebpfMonitor,
		Config:      cfg,
	})

	// 创建HTTP服务器
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Server.Port),
		Handler: router,
	}

	// 启动服务器
	go func() {
		log.Infof("Starting server on port %d", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutting down server...")

	// 优雅关闭
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Info("Server exited")
}
