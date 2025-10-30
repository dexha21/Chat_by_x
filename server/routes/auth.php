<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\UserEmailVerifyController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [RegisteredUserController::class, 'store'])
  ->middleware('guest')
  ->name('register');

Route::post('/login', [AuthenticatedSessionController::class, 'store'])
  ->middleware('guest')
  ->name('login');

Route::post('/send-code', [UserEmailVerifyController::class, 'create']);

Route::post('/request-reset-password', [PasswordResetController::class, 'sendCode']);

Route::middleware(['auth:sanctum'])->post('/edit-user', [UserController::class, 'edit']);

Route::middleware(['auth:sanctum'])->post('/delete-pp', [UserController::class, 'deletePicture']);

Route::middleware(['auth:sanctum'])->post('/change-password', [UserController::class, 'changePassword']);

Route::post('/reset-password', [PasswordResetController::class, 'resetPassword']);

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
  ->middleware('auth')
  ->name('logout');
