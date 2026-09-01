"""Meadowfire helper: run commands (optionally with sudo) and upload files over SSH with paramiko.

usage:
  python nas.py run "<command>"            # run as husky in /volume7/docker/adore-fabric
  python nas.py sudo "<command>"           # run with sudo -S (password piped)
  python nas.py put <local> <remote>       # sftp upload
  python nas.py get <remote> <local>       # sftp download
"""
import os
import sys

import paramiko

HOST = os.environ.get("NAS_HOST", "192.168.1.38")
USER = os.environ.get("NAS_USER", "husky")
PASSWORD = os.environ["NAS_PASSWORD"]
ROOT = "/volume7/docker/adore-fabric"


def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20, banner_timeout=30, auth_timeout=30)
    return client


def run(client, command, sudo=False):
    if sudo:
        command = f"sudo -S -p '' sh -c {sh_quote(command)}"
    stdin, stdout, stderr = client.exec_command(f"cd {ROOT} 2>/dev/null; {command}", get_pty=False)
    if sudo:
        stdin.write(PASSWORD + "\n")
        stdin.flush()
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def sh_quote(text):
    return "'" + text.replace("'", "'\\''") + "'"


def main():
    mode = sys.argv[1]
    client = connect()
    try:
        if mode in ("run", "sudo"):
            code, out, err = run(client, sys.argv[2], sudo=(mode == "sudo"))
            sys.stdout.write(out)
            if err.strip():
                sys.stderr.write(err)
            sys.exit(code)
        elif mode == "put":
            # The NAS has no SFTP subsystem, so stream the bytes through cat.
            local, remote = sys.argv[2], sys.argv[3]
            channel = client.get_transport().open_session()
            channel.exec_command(f"cat > {sh_quote(remote)}")
            sent = 0
            with open(local, "rb") as handle:
                while True:
                    chunk = handle.read(1 << 20)
                    if not chunk:
                        break
                    channel.sendall(chunk)
                    sent += len(chunk)
            channel.shutdown_write()
            code = channel.recv_exit_status()
            if code != 0:
                raise SystemExit(f"remote cat exited {code}: {channel.recv_stderr(4096).decode()}")
            print(f"uploaded {local} -> {remote} ({sent} bytes)")
        elif mode == "get":
            code, out, err = run(client, f"cat {sh_quote(sys.argv[2])}")
            if code != 0:
                raise SystemExit(err)
            with open(sys.argv[3], "w", encoding="utf-8", newline="") as handle:
                handle.write(out)
            print(f"downloaded {sys.argv[2]} -> {sys.argv[3]}")
        else:
            raise SystemExit("unknown mode")
    finally:
        client.close()


if __name__ == "__main__":
    main()
