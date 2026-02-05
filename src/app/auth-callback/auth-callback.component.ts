import { Component, OnInit } from '@angular/core';
import { AuthService } from '../@service/auth.service';
import { HttpService } from '../@service/http.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ImageService } from '../@service/image.service';

/**
 * Google OAuth Callback 頁面
 * 用途：
 * 使用者完成 Google 登入後會跳轉到這裡
 * 前端在此呼叫後端 API 取得使用者資料
 * 存入 AuthService / localStorage 後導回原頁面
 */
@Component({ selector: 'app-auth-callback', template: '<p>正在同步 Google 資料...</p>' })
export class AuthCallbackComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private http: HttpService,
    private router: Router,
    private imageService: ImageService
  ) { }

  /** 判斷是否已是 Cloudinary（避免重複轉存） */
  private isCloudinary(url: string): boolean {
    return !!url && url.startsWith('https://res.cloudinary.com/');
  }

  /** 把圖片 URL 轉成 File */
  private async urlToFile(url: string): Promise<File> {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`fetch avatar failed: ${resp.status}`);

    const blob = await resp.blob();
    const type = blob.type || 'image/jpeg';
    const ext =
      type.includes('png') ? 'png' :
        type.includes('webp') ? 'webp' :
          (type.includes('jpeg') || type.includes('jpg')) ? 'jpg' : 'jpg';

    return new File([blob], `google-avatar.${ext}`, { type });
  }

  private uploadAvatarToCloudinary(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      this.imageService.upload('avatars', file).subscribe({
        next: resolve,
        error: reject,
      });
    });
  }

  private updateAvatarInDb(userId: string, avatarUrl: string): void {
    this.authService.updateProfile(userId, { avatarUrl }).subscribe({
      next: () => console.log('已寫回 DB avatar_url (updateProfile)'),
      error: (e) => console.warn('寫回 DB 失敗', e),
    });
  }

  async ngOnInit() {
    this.http.getApi('http://localhost:8080/gogobuy/user/oauth').subscribe({
      next: async (res: any) => {
        if (!res) {
          Swal.fire('登入異常', '後端沒有回傳使用者資料', 'error');
          this.router.navigate(['/login']);
          return;
        }

        const userId = res.id || res.userId || res.sub;
        if (!userId) {
          Swal.fire('登入異常', '無法取得用戶識別碼', 'error');
          return;
        }

        const googleAvatar = res.avatar_url || res.avatarUrl || '';
        let finalAvatarUrl = googleAvatar;

        // ✅ 如果是 Google 頭像（不是 cloudinary）才轉存
        if (googleAvatar && !this.isCloudinary(googleAvatar)) {
          try {
            const file = await this.urlToFile(googleAvatar);
            finalAvatarUrl = await this.uploadAvatarToCloudinary(file);

            // ✅ 寫回 DB（根治 429）
            this.updateAvatarInDb(userId, finalAvatarUrl);
          } catch (e) {
            console.warn('Google avatar 轉存失敗（可能是 CORS）', e);
          }
        }

        // ✅ 這裡只做最基本的 user 存放（其他欄位你照原本補回去）
        const formattedUser = {
          id: userId,
          nickname: res.nickname,
          email: res.email,
          avatar_url: finalAvatarUrl,
          role: res.role || 'user',
        };

        this.authService.setUser(formattedUser);
        localStorage.setItem('user_info', JSON.stringify(formattedUser));
        localStorage.setItem('user_id', formattedUser.id);
        localStorage.setItem('user_avatar_url', formattedUser.avatar_url);
        localStorage.setItem('user_email', formattedUser.email);

        this.authService.refreshUser();

        const savedUrl = sessionStorage.getItem('google_return_url') || '/gogobuy';
        this.router.navigateByUrl(savedUrl);
        sessionStorage.removeItem('google_return_url');
      },
      error: (err: any) => {
        Swal.fire('Google 登入失敗', err?.message || '請稍後再試', 'error');
        this.router.navigate(['/login']);
      },
    });
  }
}
