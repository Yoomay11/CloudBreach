#include <linux/bpf.h>
#include <linux/ptrace.h>
#include <linux/sched.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

#define TASK_COMM_LEN 16
#define MAX_FILENAME_LEN 256
#define MAX_CONTAINER_ID_LEN 64

// 事件类型定义
#define EVENT_SYSCALL 1
#define EVENT_FILE_ACCESS 2
#define EVENT_NETWORK 3
#define EVENT_PROCESS 4

// 严重程度定义
#define SEVERITY_LOW 1
#define SEVERITY_MEDIUM 2
#define SEVERITY_HIGH 3
#define SEVERITY_CRITICAL 4

// 事件结构体
struct event {
    __u64 timestamp;
    __u32 pid;
    __u32 tid;
    __u32 uid;
    __u32 gid;
    char comm[TASK_COMM_LEN];
    char filename[MAX_FILENAME_LEN];
    __u32 event_type;
    __u32 severity;
    char description[128];
    char container_id[MAX_CONTAINER_ID_LEN];
};

// BPF Maps定义
struct {
    __uint(type, BPF_MAP_TYPE_PERF_EVENT_ARRAY);
    __uint(key_size, sizeof(__u32));
    __uint(value_size, sizeof(__u32));
} events SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10240);
    __type(key, __u32);
    __type(value, struct event);
} event_cache SEC(".maps");

// 辅助函数：获取容器ID
static __always_inline int get_container_id(char *container_id) {
    // 简化实现：从cgroup路径中提取容器ID
    // 实际实现需要解析/proc/self/cgroup
    __builtin_memcpy(container_id, "container_demo", 14);
    return 0;
}

// 辅助函数：检查是否为可疑行为
static __always_inline int is_suspicious_syscall(__u32 syscall_nr) {
    // 监控一些敏感系统调用
    switch (syscall_nr) {
        case 2:   // sys_fork
        case 56:  // sys_clone
        case 57:  // sys_fork
        case 59:  // sys_execve
        case 322: // sys_execveat
            return SEVERITY_MEDIUM;
        case 165: // sys_mount
        case 166: // sys_umount
        case 155: // sys_pivot_root
            return SEVERITY_HIGH;
        case 139: // sys_setfsuid
        case 140: // sys_setfsgid
        case 105: // sys_setuid
        case 106: // sys_setgid
            return SEVERITY_CRITICAL;
        default:
            return 0;
    }
}

// 系统调用入口点监控
SEC("tp/syscalls/sys_enter_openat")
int trace_openat_enter(struct trace_event_raw_sys_enter *ctx) {
    struct event event = {};
    struct task_struct *task;
    
    // 获取当前任务信息
    task = (struct task_struct *)bpf_get_current_task();
    
    event.timestamp = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.tid = bpf_get_current_pid_tgid() & 0xFFFFFFFF;
    event.uid = bpf_get_current_uid_gid() >> 32;
    event.gid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    
    // 获取文件名
    char *filename_ptr = (char *)ctx->args[1];
    bpf_probe_read_user_str(event.filename, sizeof(event.filename), filename_ptr);
    
    event.event_type = EVENT_FILE_ACCESS;
    event.severity = SEVERITY_LOW;
    
    // 检查是否访问敏感文件
    if (bpf_strncmp(event.filename, "/etc/passwd", 11) == 0 ||
        bpf_strncmp(event.filename, "/etc/shadow", 11) == 0 ||
        bpf_strncmp(event.filename, "/etc/sudoers", 12) == 0) {
        event.severity = SEVERITY_HIGH;
        __builtin_memcpy(event.description, "Sensitive file access", 22);
    } else if (bpf_strncmp(event.filename, "/proc/", 6) == 0) {
        event.severity = SEVERITY_MEDIUM;
        __builtin_memcpy(event.description, "Proc filesystem access", 23);
    } else {
        __builtin_memcpy(event.description, "File access", 12);
    }
    
    get_container_id(event.container_id);
    
    // 发送事件
    bpf_perf_event_output(ctx, &events, BPF_F_CURRENT_CPU, &event, sizeof(event));
    
    return 0;
}

// 进程创建监控
SEC("tp/syscalls/sys_enter_execve")
int trace_execve_enter(struct trace_event_raw_sys_enter *ctx) {
    struct event event = {};
    
    event.timestamp = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.tid = bpf_get_current_pid_tgid() & 0xFFFFFFFF;
    event.uid = bpf_get_current_uid_gid() >> 32;
    event.gid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    
    // 获取执行的程序名
    char *filename_ptr = (char *)ctx->args[0];
    bpf_probe_read_user_str(event.filename, sizeof(event.filename), filename_ptr);
    
    event.event_type = EVENT_PROCESS;
    event.severity = SEVERITY_MEDIUM;
    
    // 检查是否为可疑程序
    if (bpf_strncmp(event.filename, "/bin/sh", 7) == 0 ||
        bpf_strncmp(event.filename, "/bin/bash", 9) == 0) {
        if (event.uid == 0) {
            event.severity = SEVERITY_HIGH;
            __builtin_memcpy(event.description, "Root shell execution", 20);
        } else {
            __builtin_memcpy(event.description, "Shell execution", 15);
        }
    } else if (bpf_strncmp(event.filename, "/usr/bin/nc", 11) == 0 ||
               bpf_strncmp(event.filename, "/bin/nc", 7) == 0) {
        event.severity = SEVERITY_CRITICAL;
        __builtin_memcpy(event.description, "Netcat execution detected", 25);
    } else {
        __builtin_memcpy(event.description, "Process execution", 17);
    }
    
    get_container_id(event.container_id);
    
    // 发送事件
    bpf_perf_event_output(ctx, &events, BPF_F_CURRENT_CPU, &event, sizeof(event));
    
    return 0;
}

// 网络连接监控
SEC("tp/syscalls/sys_enter_connect")
int trace_connect_enter(struct trace_event_raw_sys_enter *ctx) {
    struct event event = {};
    
    event.timestamp = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.tid = bpf_get_current_pid_tgid() & 0xFFFFFFFF;
    event.uid = bpf_get_current_uid_gid() >> 32;
    event.gid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    
    event.event_type = EVENT_NETWORK;
    event.severity = SEVERITY_MEDIUM;
    __builtin_memcpy(event.description, "Network connection", 18);
    __builtin_memcpy(event.filename, "network_socket", 14);
    
    get_container_id(event.container_id);
    
    // 发送事件
    bpf_perf_event_output(ctx, &events, BPF_F_CURRENT_CPU, &event, sizeof(event));
    
    return 0;
}

// 权限提升监控
SEC("tp/syscalls/sys_enter_setuid")
int trace_setuid_enter(struct trace_event_raw_sys_enter *ctx) {
    struct event event = {};
    
    event.timestamp = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.tid = bpf_get_current_pid_tgid() & 0xFFFFFFFF;
    event.uid = bpf_get_current_uid_gid() >> 32;
    event.gid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    
    event.event_type = EVENT_SYSCALL;
    event.severity = SEVERITY_CRITICAL;
    __builtin_memcpy(event.description, "UID change attempt", 18);
    __builtin_memcpy(event.filename, "setuid_syscall", 14);
    
    get_container_id(event.container_id);
    
    // 发送事件
    bpf_perf_event_output(ctx, &events, BPF_F_CURRENT_CPU, &event, sizeof(event));
    
    return 0;
}

char _license[] SEC("license") = "GPL";