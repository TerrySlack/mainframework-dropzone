"use client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const mergeStyles = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
