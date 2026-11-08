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
      { step: 4, line: 4, locals: { arr: [5, 1, 4, 2] }, callStack: ["Solution.main"] },
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
      { step: 22, line: 9, locals: { arr: [1, 4, 2, 5], n: 4, i: 0, j: 3 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 23, line: 8, locals: { arr: [1, 4, 2, 5], n: 4, i: 1 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 24, line: 9, locals: { arr: [1, 4, 2, 5], n: 4, i: 1, j: 0 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 25, line: 10, locals: { arr: [1, 4, 2, 5], n: 4, i: 1, j: 0 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 26, line: 9, locals: { arr: [1, 4, 2, 5], n: 4, i: 1, j: 1 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 27, line: 10, locals: { arr: [1, 4, 2, 5], n: 4, i: 1, j: 1 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 28, line: 11, locals: { arr: [1, 4, 2, 5], n: 4, i: 1, j: 1, temp: 4 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 29, line: 12, locals: { arr: [1, 2, 2, 5], n: 4, i: 1, j: 1, temp: 4 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 30, line: 13, locals: { arr: [1, 2, 4, 5], n: 4, i: 1, j: 1, temp: 4 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 31, line: 9, locals: { arr: [1, 2, 4, 5], n: 4, i: 1, j: 2 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 32, line: 8, locals: { arr: [1, 2, 4, 5], n: 4, i: 2 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 33, line: 9, locals: { arr: [1, 2, 4, 5], n: 4, i: 2, j: 0 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 34, line: 10, locals: { arr: [1, 2, 4, 5], n: 4, i: 2, j: 0 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 35, line: 9, locals: { arr: [1, 2, 4, 5], n: 4, i: 2, j: 1 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 36, line: 8, locals: { arr: [1, 2, 4, 5], n: 4, i: 3 }, callStack: ["Solution.main"], stdout: "Initial array length: 4" },
      { step: 37, line: 17, locals: { arr: [1, 2, 4, 5], n: 4, i: 3 }, callStack: ["Solution.main"], stdout: "Initial array length: 4\nSorting completed." }
    ]
  },
  {
    id: "matrix-traversal",
    name: "2D Matrix Traversal & Diagonal Sum",
    code: `public class Solution {
    public static void main(String[] args) {
        int[][] matrix = {
            {1, 2, 3},
            {4, 5, 6},
            {7, 8, 9}
        };

        int rows = matrix.length;
        int cols = matrix[0].length;
        int diagSum = 0;

        System.out.println("Processing 3x3 matrix...");

        for (int row = 0; row < rows; row++) {
            for (int col = 0; col < cols; col++) {
                int val = matrix[row][col];
                if (row == col) {
                    diagSum += val;
                    System.out.println("Diagonal match [" + row + "][" + col + "] = " + val);
                }
            }
        }

        System.out.println("Primary Diagonal Sum = " + diagSum);
    }
}`,
    fallbackTrace: [
      { step: 1, line: 1, locals: {}, callStack: ["Solution"] },
      { step: 2, line: 2, locals: {}, callStack: ["Solution.main"] },
      { step: 3, line: 3, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, callStack: ["Solution.main"] },
      { step: 4, line: 9, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3 }, callStack: ["Solution.main"] },
      { step: 5, line: 10, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3 }, callStack: ["Solution.main"] },
      { step: 6, line: 11, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 0 }, callStack: ["Solution.main"] },
      { step: 7, line: 13, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 0 }, callStack: ["Solution.main"], stdout: "Processing 3x3 matrix..." },
      // row 0, col 0
      { step: 8, line: 15, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 0, row: 0 }, callStack: ["Solution.main"] },
      { step: 9, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 0, row: 0, col: 0 }, callStack: ["Solution.main"] },
      { step: 10, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 0, row: 0, col: 0, val: 1 }, callStack: ["Solution.main"] },
      { step: 11, line: 18, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 0, row: 0, col: 0, val: 1 }, callStack: ["Solution.main"] },
      { step: 12, line: 19, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 0, col: 0, val: 1 }, callStack: ["Solution.main"] },
      { step: 13, line: 20, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 0, col: 0, val: 1 }, callStack: ["Solution.main"], stdout: "Processing 3x3 matrix...\nDiagonal match [0][0] = 1" },
      // row 0, col 1
      { step: 14, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 0, col: 1 }, callStack: ["Solution.main"] },
      { step: 15, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 0, col: 1, val: 2 }, callStack: ["Solution.main"] },
      { step: 16, line: 18, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 0, col: 1, val: 2 }, callStack: ["Solution.main"] },
      // row 0, col 2
      { step: 17, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 0, col: 2 }, callStack: ["Solution.main"] },
      { step: 18, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 0, col: 2, val: 3 }, callStack: ["Solution.main"] },
      { step: 19, line: 18, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 0, col: 2, val: 3 }, callStack: ["Solution.main"] },
      // row 1, col 0
      { step: 20, line: 15, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 1 }, callStack: ["Solution.main"] },
      { step: 21, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 1, col: 0 }, callStack: ["Solution.main"] },
      { step: 22, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 1, col: 0, val: 4 }, callStack: ["Solution.main"] },
      // row 1, col 1
      { step: 23, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 1, col: 1 }, callStack: ["Solution.main"] },
      { step: 24, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 1, col: 1, val: 5 }, callStack: ["Solution.main"] },
      { step: 25, line: 18, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 1, row: 1, col: 1, val: 5 }, callStack: ["Solution.main"] },
      { step: 26, line: 19, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 1, col: 1, val: 5 }, callStack: ["Solution.main"] },
      { step: 27, line: 20, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 1, col: 1, val: 5 }, callStack: ["Solution.main"], stdout: "Processing 3x3 matrix...\nDiagonal match [0][0] = 1\nDiagonal match [1][1] = 5" },
      // row 1, col 2
      { step: 28, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 1, col: 2 }, callStack: ["Solution.main"] },
      { step: 29, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 1, col: 2, val: 6 }, callStack: ["Solution.main"] },
      // row 2, col 0
      { step: 30, line: 15, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 2 }, callStack: ["Solution.main"] },
      { step: 31, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 2, col: 0 }, callStack: ["Solution.main"] },
      { step: 32, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 2, col: 0, val: 7 }, callStack: ["Solution.main"] },
      // row 2, col 1
      { step: 33, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 2, col: 1 }, callStack: ["Solution.main"] },
      { step: 34, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 2, col: 1, val: 8 }, callStack: ["Solution.main"] },
      // row 2, col 2
      { step: 35, line: 16, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 2, col: 2 }, callStack: ["Solution.main"] },
      { step: 36, line: 17, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 2, col: 2, val: 9 }, callStack: ["Solution.main"] },
      { step: 37, line: 18, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 6, row: 2, col: 2, val: 9 }, callStack: ["Solution.main"] },
      { step: 38, line: 19, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 15, row: 2, col: 2, val: 9 }, callStack: ["Solution.main"] },
      { step: 39, line: 20, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 15, row: 2, col: 2, val: 9 }, callStack: ["Solution.main"], stdout: "Processing 3x3 matrix...\nDiagonal match [0][0] = 1\nDiagonal match [1][1] = 5\nDiagonal match [2][2] = 9" },
      { step: 40, line: 25, locals: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], rows: 3, cols: 3, diagSum: 15 }, callStack: ["Solution.main"], stdout: "Processing 3x3 matrix...\nDiagonal match [0][0] = 1\nDiagonal match [1][1] = 5\nDiagonal match [2][2] = 9\nPrimary Diagonal Sum = 15" }
    ]
  },
  {
    id: "singly-linked-list",
    name: "Singly Linked List Traversal",
    code: `public class Solution {
    static class Node {
        int val;
        Node next;
        Node(int val) {
            this.val = val;
            this.next = null;
        }
    }

    public static void main(String[] args) {
        // Construct Linked List: 10 -> 20 -> 30 -> 40 -> null
        Node head = new Node(10);
        head.next = new Node(20);
        head.next.next = new Node(30);
        head.next.next.next = new Node(40);

        int count = 0;
        int sum = 0;
        Node curr = head;

        System.out.println("Traversing Singly Linked List...");

        while (curr != null) {
            count++;
            sum += curr.val;
            System.out.println("Visited Node " + count + " with value: " + curr.val);
            curr = curr.next;
        }

        System.out.println("Traversal complete. Total sum: " + sum);
    }
}`,
    fallbackTrace: [
      { step: 1, line: 11, locals: {}, callStack: ["Solution"] },
      { step: 2, line: 12, locals: {}, callStack: ["Solution.main"] },
      { step: 3, line: 14, locals: { list: [10], currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 4, line: 15, locals: { list: [10, 20], currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 5, line: 16, locals: { list: [10, 20, 30], currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 6, line: 17, locals: { list: [10, 20, 30, 40], currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 7, line: 19, locals: { list: [10, 20, 30, 40], count: 0, currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 8, line: 20, locals: { list: [10, 20, 30, 40], count: 0, sum: 0, currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 9, line: 21, locals: { list: [10, 20, 30, 40], count: 0, sum: 0, currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 10, line: 23, locals: { list: [10, 20, 30, 40], count: 0, sum: 0, currIdx: 0 }, callStack: ["Solution.main"], stdout: "Traversing Singly Linked List..." },
      // Node 0 (val = 10)
      { step: 11, line: 25, locals: { list: [10, 20, 30, 40], count: 0, sum: 0, currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 12, line: 26, locals: { list: [10, 20, 30, 40], count: 1, sum: 0, currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 13, line: 27, locals: { list: [10, 20, 30, 40], count: 1, sum: 10, currIdx: 0 }, callStack: ["Solution.main"] },
      { step: 14, line: 28, locals: { list: [10, 20, 30, 40], count: 1, sum: 10, currIdx: 0 }, callStack: ["Solution.main"], stdout: "Traversing Singly Linked List...\nVisited Node 1 with value: 10" },
      { step: 15, line: 29, locals: { list: [10, 20, 30, 40], count: 1, sum: 10, currIdx: 1 }, callStack: ["Solution.main"] },
      // Node 1 (val = 20)
      { step: 16, line: 25, locals: { list: [10, 20, 30, 40], count: 1, sum: 10, currIdx: 1 }, callStack: ["Solution.main"] },
      { step: 17, line: 26, locals: { list: [10, 20, 30, 40], count: 2, sum: 10, currIdx: 1 }, callStack: ["Solution.main"] },
      { step: 18, line: 27, locals: { list: [10, 20, 30, 40], count: 2, sum: 30, currIdx: 1 }, callStack: ["Solution.main"] },
      { step: 19, line: 28, locals: { list: [10, 20, 30, 40], count: 2, sum: 30, currIdx: 1 }, callStack: ["Solution.main"], stdout: "Traversing Singly Linked List...\nVisited Node 1 with value: 10\nVisited Node 2 with value: 20" },
      { step: 20, line: 29, locals: { list: [10, 20, 30, 40], count: 2, sum: 30, currIdx: 2 }, callStack: ["Solution.main"] },
      // Node 2 (val = 30)
      { step: 21, line: 25, locals: { list: [10, 20, 30, 40], count: 2, sum: 30, currIdx: 2 }, callStack: ["Solution.main"] },
      { step: 22, line: 26, locals: { list: [10, 20, 30, 40], count: 3, sum: 30, currIdx: 2 }, callStack: ["Solution.main"] },
      { step: 23, line: 27, locals: { list: [10, 20, 30, 40], count: 3, sum: 60, currIdx: 2 }, callStack: ["Solution.main"] },
      { step: 24, line: 28, locals: { list: [10, 20, 30, 40], count: 3, sum: 60, currIdx: 2 }, callStack: ["Solution.main"], stdout: "Traversing Singly Linked List...\nVisited Node 1 with value: 10\nVisited Node 2 with value: 20\nVisited Node 3 with value: 30" },
      { step: 25, line: 29, locals: { list: [10, 20, 30, 40], count: 3, sum: 60, currIdx: 3 }, callStack: ["Solution.main"] },
      // Node 3 (val = 40)
      { step: 26, line: 25, locals: { list: [10, 20, 30, 40], count: 3, sum: 60, currIdx: 3 }, callStack: ["Solution.main"] },
      { step: 27, line: 26, locals: { list: [10, 20, 30, 40], count: 4, sum: 60, currIdx: 3 }, callStack: ["Solution.main"] },
      { step: 28, line: 27, locals: { list: [10, 20, 30, 40], count: 4, sum: 100, currIdx: 3 }, callStack: ["Solution.main"] },
      { step: 29, line: 28, locals: { list: [10, 20, 30, 40], count: 4, sum: 100, currIdx: 3 }, callStack: ["Solution.main"], stdout: "Traversing Singly Linked List...\nVisited Node 1 with value: 10\nVisited Node 2 with value: 20\nVisited Node 3 with value: 30\nVisited Node 4 with value: 40" },
      { step: 30, line: 29, locals: { list: [10, 20, 30, 40], count: 4, sum: 100, currIdx: 4 }, callStack: ["Solution.main"] },
      // Loop ends (curr is null)
      { step: 31, line: 25, locals: { list: [10, 20, 30, 40], count: 4, sum: 100, currIdx: 4 }, callStack: ["Solution.main"] },
      { step: 32, line: 32, locals: { list: [10, 20, 30, 40], count: 4, sum: 100 }, callStack: ["Solution.main"], stdout: "Traversing Singly Linked List...\nVisited Node 1 with value: 10\nVisited Node 2 with value: 20\nVisited Node 3 with value: 30\nVisited Node 4 with value: 40\nTraversal complete. Total sum: 100" }
    ]
  }
];
