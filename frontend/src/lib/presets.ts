import { AlgorithmPreset } from "@/types/tracer";

export const PRESETS: AlgorithmPreset[] = [
  {
    id: "two-sum",
    name: "Two Sum (Array & Pointers)",
    code: `public class Solution {
    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int left = 0;
        int right = nums.length - 1;
        int found = -1;

        System.out.println("Searching target sum: " + target);

        while (left < right) {
            int sum = nums[left] + nums[right];
            if (sum == target) {
                found = 1;
                System.out.println("Found match at indices: " + left + ", " + right);
                break;
            } else if (sum < target) {
                left++;
            } else {
                right--;
            }
        }
    }
}`,
    fallbackTrace: [
      { step: 1, line: 1, locals: {}, callStack: ["Solution"] },
      { step: 2, line: 2, locals: {}, callStack: ["Solution.main"] },
      { step: 3, line: 3, locals: { nums: [2, 7, 11, 15] }, callStack: ["Solution.main"] },
      { step: 4, line: 4, locals: { nums: [2, 7, 11, 15], target: 9 }, callStack: ["Solution.main"] },
      { step: 5, line: 5, locals: { nums: [2, 7, 11, 15], target: 9, left: 0 }, callStack: ["Solution.main"] },
      { step: 6, line: 6, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 3 }, callStack: ["Solution.main"] },
      { step: 7, line: 7, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 3, found: -1 }, callStack: ["Solution.main"] },
      { step: 8, line: 9, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 3, found: -1 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 9, line: 11, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 3, found: -1 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 10, line: 12, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 3, found: -1, sum: 17 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 11, line: 13, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 3, found: -1, sum: 17 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 12, line: 17, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 3, found: -1, sum: 17 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 13, line: 20, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 2, found: -1, sum: 17 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 14, line: 11, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 2, found: -1 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 15, line: 12, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 2, found: -1, sum: 13 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 16, line: 13, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 2, found: -1, sum: 13 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 17, line: 20, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 1, found: -1, sum: 13 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 18, line: 11, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 1, found: -1 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 19, line: 12, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 1, found: -1, sum: 9 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 20, line: 13, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 1, found: -1, sum: 9 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 21, line: 14, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 1, found: 1, sum: 9 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9" },
      { step: 22, line: 15, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 1, found: 1, sum: 9 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9\nFound match at indices: 0, 1" },
      { step: 23, line: 16, locals: { nums: [2, 7, 11, 15], target: 9, left: 0, right: 1, found: 1, sum: 9 }, callStack: ["Solution.main"], stdout: "Searching target sum: 9\nFound match at indices: 0, 1" }
    ]
  },
  {
    id: "bubble-sort",
    name: "Bubble Sort (Array Mutation)",
    code: `public class Solution {
    public static void main(String[] args) {
        int[] arr = {5, 1, 4, 2};
        int n = arr.length;
        
        System.out.println("Initial array length: " + n);

        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        System.out.println("Sorting completed.");
    }
}`,
    fallbackTrace: [
      { step: 1, line: 1, locals: {}, callStack: ["Solution"] },
      { step: 2, line: 2, locals: {}, callStack: ["Solution.main"] },
      { step: 3, line: 3, locals: { arr: [5, 1, 4, 2] }, callStack: ["Solution.main"] },
      { step: 4, line: 4, locals: { arr: [5, 1, 4, 2], n: 4 }, callStack: ["Solution.main"] },
      { step: 5, line: 6, locals: { arr: [5, 1, 4, 2], n: 4 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 6, line: 8, locals: { arr: [5, 1, 4, 2], n: 4, i: 0 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 7, line: 9, locals: { arr: [5, 1, 4, 2], n: 4, i: 0, j: 0 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 8, line: 10, locals: { arr: [5, 1, 4, 2], n: 4, i: 0, j: 0 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 9, line: 11, locals: { arr: [5, 1, 4, 2], n: 4, i: 0, j: 0, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 10, line: 12, locals: { arr: [1, 1, 4, 2], n: 4, i: 0, j: 0, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 11, line: 13, locals: { arr: [1, 5, 4, 2], n: 4, i: 0, j: 0, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 12, line: 9, locals: { arr: [1, 5, 4, 2], n: 4, i: 0, j: 1 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 13, line: 10, locals: { arr: [1, 5, 4, 2], n: 4, i: 0, j: 1 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 14, line: 11, locals: { arr: [1, 5, 4, 2], n: 4, i: 0, j: 1, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 15, line: 12, locals: { arr: [1, 4, 4, 2], n: 4, i: 0, j: 1, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 16, line: 13, locals: { arr: [1, 4, 5, 2], n: 4, i: 0, j: 1, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 17, line: 9, locals: { arr: [1, 4, 5, 2], n: 4, i: 0, j: 2 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 18, line: 10, locals: { arr: [1, 4, 5, 2], n: 4, i: 0, j: 2 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 19, line: 11, locals: { arr: [1, 4, 5, 2], n: 4, i: 0, j: 2, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 20, line: 12, locals: { arr: [1, 4, 2, 2], n: 4, i: 0, j: 2, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 21, line: 13, locals: { arr: [1, 4, 2, 5], n: 4, i: 0, j: 2, temp: 5 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 22, line: 17, locals: { arr: [1, 2, 4, 5], n: 4, i: 3 }, callStack: ["Solution.main"], stdout: "Initial array length: 4\nSorting completed." }
    ]
  }
];
