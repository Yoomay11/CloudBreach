package attack

import (
	"fmt"
	"math"
	"time"

	"github.com/sirupsen/logrus"
)

// AttackNode 攻击节点
type AttackNode struct {
	ID          string            `json:"id"`
	Label       string            `json:"label"`
	Type        string            `json:"type"` // entry, vulnerability, exploit, privilege, persistence, exfiltration
	Severity    string            `json:"severity"` // critical, high, medium, low
	Description string            `json:"description"`
	MITRE       string            `json:"mitre"`
	Remediation string            `json:"remediation"`
	CVSS        float64           `json:"cvss"`
	Metadata    map[string]string `json:"metadata"`
}

// AttackEdge 攻击边
type AttackEdge struct {
	ID          string  `json:"id"`
	From        string  `json:"from"`
	To          string  `json:"to"`
	Label       string  `json:"label"`
	Probability float64 `json:"probability"`
	Weight      float64 `json:"weight"`
	Conditions  []string `json:"conditions"`
}

// AttackChain 攻击链
type AttackChain struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Nodes     []AttackNode  `json:"nodes"`
	Edges     []AttackEdge  `json:"edges"`
	RiskScore float64       `json:"risk_score"`
	Status    string        `json:"status"`
	CreatedAt time.Time     `json:"created_at"`
	Summary   ChainSummary  `json:"summary"`
}

// ChainSummary 攻击链摘要
type ChainSummary struct {
	TotalSteps         int     `json:"total_steps"`
	CriticalVulns      int     `json:"critical_vulns"`
	EstimatedTime      string  `json:"estimated_time"`
	SuccessProbability float64 `json:"success_probability"`
	MostLikelyPath     []string `json:"most_likely_path"`
	RiskFactors        []string `json:"risk_factors"`
}

// AttackGraph 攻击图
type AttackGraph struct {
	nodes     map[string]*AttackNode
	edges     map[string][]*AttackEdge
	adjList   map[string][]string
	logger    *logrus.Logger
}

// NewAttackGraph 创建新的攻击图
func NewAttackGraph(logger *logrus.Logger) *AttackGraph {
	return &AttackGraph{
		nodes:   make(map[string]*AttackNode),
		edges:   make(map[string][]*AttackEdge),
		adjList: make(map[string][]string),
		logger:  logger,
	}
}

// AddNode 添加攻击节点
func (ag *AttackGraph) AddNode(node *AttackNode) {
	ag.nodes[node.ID] = node
	if ag.adjList[node.ID] == nil {
		ag.adjList[node.ID] = make([]string, 0)
	}
}

// AddEdge 添加攻击边
func (ag *AttackGraph) AddEdge(edge *AttackEdge) {
	ag.edges[edge.From] = append(ag.edges[edge.From], edge)
	ag.adjList[edge.From] = append(ag.adjList[edge.From], edge.To)
}

// FindAllPaths 查找所有攻击路径
func (ag *AttackGraph) FindAllPaths(startNodeID, endNodeID string) [][]string {
	var allPaths [][]string
	var currentPath []string
	visited := make(map[string]bool)

	ag.dfsAllPaths(startNodeID, endNodeID, visited, currentPath, &allPaths)
	return allPaths
}

// dfsAllPaths 深度优先搜索所有路径
func (ag *AttackGraph) dfsAllPaths(current, target string, visited map[string]bool, path []string, allPaths *[][]string) {
	visited[current] = true
	path = append(path, current)

	if current == target {
		// 找到目标，复制路径
		pathCopy := make([]string, len(path))
		copy(pathCopy, path)
		*allPaths = append(*allPaths, pathCopy)
	} else {
		// 继续搜索邻接节点
		for _, neighbor := range ag.adjList[current] {
			if !visited[neighbor] {
				ag.dfsAllPaths(neighbor, target, visited, path, allPaths)
			}
		}
	}

	// 回溯
	visited[current] = false
	path = path[:len(path)-1]
}

// CalculatePathProbability 计算路径成功概率
func (ag *AttackGraph) CalculatePathProbability(path []string) float64 {
	if len(path) < 2 {
		return 1.0
	}

	probability := 1.0
	for i := 0; i < len(path)-1; i++ {
		from := path[i]
		to := path[i+1]
		
		// 查找对应的边
		for _, edge := range ag.edges[from] {
			if edge.To == to {
				probability *= edge.Probability
				break
			}
		}
	}

	return probability
}

// CalculatePathRisk 计算路径风险评分
func (ag *AttackGraph) CalculatePathRisk(path []string) float64 {
	if len(path) == 0 {
		return 0.0
	}

	totalRisk := 0.0
	for _, nodeID := range path {
		if node, exists := ag.nodes[nodeID]; exists {
			// 基于CVSS评分和严重程度计算风险
			severityMultiplier := ag.getSeverityMultiplier(node.Severity)
			nodeRisk := node.CVSS * severityMultiplier
			totalRisk += nodeRisk
		}
	}

	// 路径概率影响风险评分
	pathProbability := ag.CalculatePathProbability(path)
	riskScore := (totalRisk / float64(len(path))) * pathProbability

	return math.Min(10.0, riskScore) // 限制在10分以内
}

// getSeverityMultiplier 获取严重程度乘数
func (ag *AttackGraph) getSeverityMultiplier(severity string) float64 {
	switch severity {
	case "critical":
		return 1.5
	case "high":
		return 1.2
	case "medium":
		return 1.0
	case "low":
		return 0.8
	default:
		return 1.0
	}
}

// FindMostLikelyPath 查找最可能的攻击路径
func (ag *AttackGraph) FindMostLikelyPath(startNodeID, endNodeID string) []string {
	allPaths := ag.FindAllPaths(startNodeID, endNodeID)
	if len(allPaths) == 0 {
		return nil
	}

	var bestPath []string
	bestProbability := 0.0

	for _, path := range allPaths {
		probability := ag.CalculatePathProbability(path)
		if probability > bestProbability {
			bestProbability = probability
			bestPath = path
		}
	}

	return bestPath
}

// FindHighestRiskPath 查找风险最高的攻击路径
func (ag *AttackGraph) FindHighestRiskPath(startNodeID, endNodeID string) []string {
	allPaths := ag.FindAllPaths(startNodeID, endNodeID)
	if len(allPaths) == 0 {
		return nil
	}

	var riskiestPath []string
	highestRisk := 0.0

	for _, path := range allPaths {
		risk := ag.CalculatePathRisk(path)
		if risk > highestRisk {
			highestRisk = risk
			riskiestPath = path
		}
	}

	return riskiestPath
}

// AnalyzeAttackChain 分析攻击链
func (ag *AttackGraph) AnalyzeAttackChain(name string) *AttackChain {
	// 查找入口和出口节点
	entryNodes := ag.findNodesByType("entry")
	exfilNodes := ag.findNodesByType("exfiltration")

	if len(entryNodes) == 0 || len(exfilNodes) == 0 {
		ag.logger.Warn("No entry or exfiltration nodes found")
		return nil
	}

	// 使用第一个入口和出口节点
	startNode := entryNodes[0]
	endNode := exfilNodes[0]

	// 查找所有路径
	allPaths := ag.FindAllPaths(startNode, endNode)
	if len(allPaths) == 0 {
		ag.logger.Warn("No attack paths found")
		return nil
	}

	// 找到最可能的路径
	mostLikelyPath := ag.FindMostLikelyPath(startNode, endNode)
	highestRiskPath := ag.FindHighestRiskPath(startNode, endNode)

	// 计算统计信息
	totalSteps := len(mostLikelyPath)
	criticalVulns := ag.countCriticalVulns(mostLikelyPath)
	successProbability := ag.CalculatePathProbability(mostLikelyPath) * 100
	riskScore := ag.CalculatePathRisk(highestRiskPath)

	// 估算攻击时间
	estimatedTime := ag.estimateAttackTime(totalSteps, criticalVulns)

	// 构建攻击链
	chain := &AttackChain{
		ID:        fmt.Sprintf("chain-%d", time.Now().Unix()),
		Name:      name,
		Nodes:     ag.getNodesFromPath(mostLikelyPath),
		Edges:     ag.getEdgesFromPath(mostLikelyPath),
		RiskScore: riskScore,
		Status:    "completed",
		CreatedAt: time.Now(),
		Summary: ChainSummary{
			TotalSteps:         totalSteps,
			CriticalVulns:      criticalVulns,
			EstimatedTime:      estimatedTime,
			SuccessProbability: successProbability,
			MostLikelyPath:     mostLikelyPath,
			RiskFactors:        ag.identifyRiskFactors(mostLikelyPath),
		},
	}

	return chain
}

// findNodesByType 根据类型查找节点
func (ag *AttackGraph) findNodesByType(nodeType string) []string {
	var nodes []string
	for id, node := range ag.nodes {
		if node.Type == nodeType {
			nodes = append(nodes, id)
		}
	}
	return nodes
}

// countCriticalVulns 统计关键漏洞数量
func (ag *AttackGraph) countCriticalVulns(path []string) int {
	count := 0
	for _, nodeID := range path {
		if node, exists := ag.nodes[nodeID]; exists {
			if node.Severity == "critical" {
				count++
			}
		}
	}
	return count
}

// estimateAttackTime 估算攻击时间
func (ag *AttackGraph) estimateAttackTime(steps, criticalVulns int) string {
	// 基于步骤数和关键漏洞数估算时间
	baseTime := steps * 30 // 每步30分钟
	criticalTime := criticalVulns * 60 // 每个关键漏洞额外60分钟
	totalMinutes := baseTime + criticalTime

	hours := totalMinutes / 60
	if hours < 1 {
		return "< 1小时"
	} else if hours <= 2 {
		return "1-2小时"
	} else if hours <= 4 {
		return "2-4小时"
	} else if hours <= 8 {
		return "4-8小时"
	} else {
		return "> 8小时"
	}
}

// getNodesFromPath 从路径获取节点
func (ag *AttackGraph) getNodesFromPath(path []string) []AttackNode {
	var nodes []AttackNode
	for _, nodeID := range path {
		if node, exists := ag.nodes[nodeID]; exists {
			nodes = append(nodes, *node)
		}
	}
	return nodes
}

// getEdgesFromPath 从路径获取边
func (ag *AttackGraph) getEdgesFromPath(path []string) []AttackEdge {
	var edges []AttackEdge
	for i := 0; i < len(path)-1; i++ {
		from := path[i]
		to := path[i+1]
		
		for _, edge := range ag.edges[from] {
			if edge.To == to {
				edges = append(edges, *edge)
				break
			}
		}
	}
	return edges
}

// identifyRiskFactors 识别风险因素
func (ag *AttackGraph) identifyRiskFactors(path []string) []string {
	var factors []string
	criticalCount := 0
	highCount := 0

	for _, nodeID := range path {
		if node, exists := ag.nodes[nodeID]; exists {
			switch node.Severity {
			case "critical":
				criticalCount++
			case "high":
				highCount++
			}
		}
	}

	if criticalCount > 0 {
		factors = append(factors, fmt.Sprintf("%d个关键漏洞", criticalCount))
	}
	if highCount > 0 {
		factors = append(factors, fmt.Sprintf("%d个高危漏洞", highCount))
	}
	if len(path) > 5 {
		factors = append(factors, "攻击路径较长")
	}

	probability := ag.CalculatePathProbability(path)
	if probability > 0.8 {
		factors = append(factors, "攻击成功率高")
	}

	return factors
}

// ChainAnalyzer 攻击链分析器
type ChainAnalyzer struct {
	graph  *AttackGraph
	logger *logrus.Logger
}

// NewChainAnalyzer 创建攻击链分析器
func NewChainAnalyzer(logger *logrus.Logger) *ChainAnalyzer {
	return &ChainAnalyzer{
		graph:  NewAttackGraph(logger),
		logger: logger,
	}
}

// LoadSampleData 加载示例数据
func (ca *ChainAnalyzer) LoadSampleData() {
	// 添加攻击节点
	nodes := []*AttackNode{
		{
			ID:          "1",
			Label:       "初始访问\n(SQL注入)",
			Type:        "entry",
			Severity:    "high",
			Description: "通过SQL注入漏洞获得初始访问权限",
			MITRE:       "T1190",
			Remediation: "修复SQL注入漏洞，使用参数化查询",
			CVSS:        8.1,
		},
		{
			ID:          "2",
			Label:       "权限发现\n(枚举用户)",
			Type:        "vulnerability",
			Severity:    "medium",
			Description: "枚举数据库用户和权限信息",
			MITRE:       "T1087",
			Remediation: "限制数据库用户权限，启用审计日志",
			CVSS:        5.3,
		},
		{
			ID:          "3",
			Label:       "权限提升\n(数据库管理员)",
			Type:        "privilege",
			Severity:    "critical",
			Description: "利用数据库配置错误提升到管理员权限",
			MITRE:       "T1068",
			Remediation: "加强数据库安全配置，最小权限原则",
			CVSS:        9.8,
		},
		{
			ID:          "4",
			Label:       "横向移动\n(内网扫描)",
			Type:        "exploit",
			Severity:    "high",
			Description: "扫描内网其他系统寻找攻击目标",
			MITRE:       "T1018",
			Remediation: "网络分段，部署入侵检测系统",
			CVSS:        7.5,
		},
		{
			ID:          "5",
			Label:       "持久化\n(后门植入)",
			Type:        "persistence",
			Severity:    "critical",
			Description: "在系统中植入后门维持访问权限",
			MITRE:       "T1053",
			Remediation: "定期安全扫描，监控异常进程",
			CVSS:        8.8,
		},
		{
			ID:          "6",
			Label:       "数据窃取\n(敏感信息)",
			Type:        "exfiltration",
			Severity:    "critical",
			Description: "窃取敏感数据并外传",
			MITRE:       "T1041",
			Remediation: "数据加密，网络流量监控",
			CVSS:        9.1,
		},
	}

	for _, node := range nodes {
		ca.graph.AddNode(node)
	}

	// 添加攻击边
	edges := []*AttackEdge{
		{ID: "e1", From: "1", To: "2", Label: "95%", Probability: 0.95, Weight: 1.0},
		{ID: "e2", From: "2", To: "3", Label: "80%", Probability: 0.80, Weight: 1.2},
		{ID: "e3", From: "3", To: "4", Label: "90%", Probability: 0.90, Weight: 1.1},
		{ID: "e4", From: "4", To: "5", Label: "75%", Probability: 0.75, Weight: 1.3},
		{ID: "e5", From: "5", To: "6", Label: "85%", Probability: 0.85, Weight: 1.2},
	}

	for _, edge := range edges {
		ca.graph.AddEdge(edge)
	}
}

// AnalyzeChain 分析攻击链
func (ca *ChainAnalyzer) AnalyzeChain(name string) *AttackChain {
	ca.logger.Info("Starting attack chain analysis: ", name)
	return ca.graph.AnalyzeAttackChain(name)
}

// GetAllChains 获取所有攻击链
func (ca *ChainAnalyzer) GetAllChains() []*AttackChain {
	// 生成示例攻击链列表
	chains := []*AttackChain{
		{
			ID:        "chain-1",
			Name:      "Web应用渗透攻击链",
			RiskScore: 8.5,
			Status:    "completed",
			CreatedAt: time.Now().Add(-2 * time.Hour),
			Summary: ChainSummary{
				TotalSteps:         6,
				CriticalVulns:      2,
				EstimatedTime:      "2-4小时",
				SuccessProbability: 85.0,
				MostLikelyPath:     []string{"1", "2", "3", "4", "5", "6"},
				RiskFactors:        []string{"2个关键漏洞", "1个高危漏洞", "攻击成功率高"},
			},
		},
		{
			ID:        "chain-2",
			Name:      "容器逃逸攻击链",
			RiskScore: 9.2,
			Status:    "completed",
			CreatedAt: time.Now().Add(-1 * time.Hour),
			Summary: ChainSummary{
				TotalSteps:         4,
				CriticalVulns:      3,
				EstimatedTime:      "1-2小时",
				SuccessProbability: 92.0,
				MostLikelyPath:     []string{"container-1", "escape-1", "privilege-1", "exfil-1"},
				RiskFactors:        []string{"3个关键漏洞", "攻击成功率高"},
			},
		},
		{
			ID:        "chain-3",
			Name:      "云服务攻击链",
			RiskScore: 7.8,
			Status:    "completed",
			CreatedAt: time.Now().Add(-30 * time.Minute),
			Summary: ChainSummary{
				TotalSteps:         5,
				CriticalVulns:      1,
				EstimatedTime:      "2-4小时",
				SuccessProbability: 78.0,
				MostLikelyPath:     []string{"cloud-1", "iam-1", "s3-1", "lambda-1", "data-1"},
				RiskFactors:        []string{"1个关键漏洞", "2个高危漏洞", "攻击路径较长"},
			},
		},
	}

	ca.logger.WithField("total_chains", len(chains)).Info("Retrieved all attack chains")
	return chains
}