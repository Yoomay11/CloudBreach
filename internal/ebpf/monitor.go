package ebpf

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	"cloudsecops/internal/logger"

	"github.com/cilium/ebpf"
	"github.com/cilium/ebpf/link"
	"github.com/cilium/ebpf/perf"
	"github.com/cilium/ebpf/rlimit"
	"github.com/sirupsen/logrus"
)

// Event eBPF事件结构
type Event struct {
	Timestamp   int64  `json:"timestamp"`
	PID         uint32 `json:"pid"`
	TID         uint32 `json:"tid"`
	UID         uint32 `json:"uid"`
	GID         uint32 `json:"gid"`
	Comm        string `json:"comm"`
	Filename    string `json:"filename"`
	EventType   string `json:"event_type"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
	ContainerID string `json:"container_id"`
}

// Monitor eBPF监控器
type Monitor struct {
	mu       sync.RWMutex
	running  bool
	cancel   context.CancelFunc
	spec     *ebpf.CollectionSpec
	coll     *ebpf.Collection
	links    []link.Link
	reader   *perf.Reader
	events   chan Event
	log      *logrus.Logger
}

// NewMonitor 创建新的eBPF监控器
func NewMonitor() (*Monitor, error) {
	// 移除内存限制
	if err := rlimit.RemoveMemlock(); err != nil {
		return nil, fmt.Errorf("failed to remove memlock: %w", err)
	}

	return &Monitor{
		events: make(chan Event, 1000),
		log:    logger.GetLogger(),
	}, nil
}

// Start 启动eBPF监控
func (m *Monitor) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.running {
		return fmt.Errorf("monitor is already running")
	}

	ctx, cancel := context.WithCancel(context.Background())
	m.cancel = cancel

	// 加载eBPF程序（这里使用模拟实现）
	if err := m.loadPrograms(); err != nil {
		return fmt.Errorf("failed to load eBPF programs: %w", err)
	}

	// 启动事件处理
	go m.processEvents(ctx)

	// 启动模拟事件生成器（用于演示）
	go m.simulateEvents(ctx)

	m.running = true
	m.log.Info("eBPF monitor started")

	return nil
}

// Stop 停止eBPF监控
func (m *Monitor) Stop() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.running {
		return nil
	}

	if m.cancel != nil {
		m.cancel()
	}

	// 清理资源
	if err := m.cleanup(); err != nil {
		m.log.Errorf("Failed to cleanup eBPF resources: %v", err)
	}

	m.running = false
	m.log.Info("eBPF monitor stopped")

	return nil
}

// Close 关闭监控器
func (m *Monitor) Close() error {
	return m.Stop()
}

// GetEvents 获取事件通道
func (m *Monitor) GetEvents() <-chan Event {
	return m.events
}

// IsRunning 检查监控器是否运行中
func (m *Monitor) IsRunning() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.running
}

// loadPrograms 加载eBPF程序（模拟实现）
func (m *Monitor) loadPrograms() error {
	m.log.Info("Loading eBPF programs...")
	
	// 尝试加载eBPF程序
	// 注意：这需要root权限和内核支持
	if os.Geteuid() != 0 {
		m.log.Warn("eBPF programs require root privileges, falling back to simulation mode")
		return nil
	}
	
	// 检查eBPF程序文件是否存在
	programPath := "./internal/ebpf/programs/monitor.o"
	if _, err := os.Stat(programPath); os.IsNotExist(err) {
		m.log.Warn("eBPF program not compiled, falling back to simulation mode")
		m.log.Info("To compile eBPF program: cd internal/ebpf/programs && clang -O2 -target bpf -c monitor.c -o monitor.o")
		return nil
	}
	
	m.log.Info("eBPF program found, attempting to load...")
	// TODO: 实际加载编译好的eBPF字节码
	// 这里可以使用 cilium/ebpf 库加载程序
	return nil
}

// cleanup 清理资源
func (m *Monitor) cleanup() error {
	// 关闭链接
	for _, l := range m.links {
		if err := l.Close(); err != nil {
			m.log.Errorf("Failed to close link: %v", err)
		}
	}
	m.links = nil

	// 关闭集合
	if m.coll != nil {
		m.coll.Close()
		m.coll = nil
	}

	// 关闭读取器
	if m.reader != nil {
		m.reader.Close()
		m.reader = nil
	}

	return nil
}

// processEvents 处理eBPF事件
func (m *Monitor) processEvents(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			// 在实际实现中，这里会从perf buffer读取事件
			time.Sleep(100 * time.Millisecond)
		}
	}
}

// simulateEvents 模拟事件生成（用于演示）
func (m *Monitor) simulateEvents(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	eventTypes := []string{"syscall", "file_access", "network", "process"}
	severities := []string{"low", "medium", "high", "critical"}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// 生成模拟事件
			event := Event{
				Timestamp:   time.Now().Unix(),
				PID:         1234,
				TID:         1234,
				UID:         0,
				GID:         0,
				Comm:        "suspicious_proc",
				Filename:    "/etc/passwd",
				EventType:   eventTypes[time.Now().Second()%len(eventTypes)],
				Severity:    severities[time.Now().Second()%len(severities)],
				Description: "Suspicious file access detected",
				ContainerID: "container_123",
			}

			select {
			case m.events <- event:
				m.log.WithFields(map[string]interface{}{
					"event_type": event.EventType,
					"severity":   event.Severity,
					"pid":        event.PID,
				}).Debug("Generated eBPF event")
			default:
				m.log.Warn("Event channel is full, dropping event")
			}
		}
	}
}