
import pandas as pd
import win32com.client as win32
import json
import sys
import os
from datetime import datetime, timedelta

# 입력 인자:
# sys.argv[1]: JSON 인코딩된 index 리스트 (예: "[0, 1]")
# sys.argv[2]: CSV 파일 경로
# sys.argv[3]: 템플릿 HWP 경로
# sys.argv[4]: 저장 디렉토리 경로

try:
    index_list = json.loads(sys.argv[1])
    csv_path = sys.argv[2]
    template_path = sys.argv[3]
    save_dir = sys.argv[4]

    df = pd.read_csv(csv_path, encoding="utf-8")

    hwp = win32.gencache.EnsureDispatch("HWPFrame.HwpObject")
    hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
    hwp.Open(template_path)

    job_code_map = {
        "rd": "798002",  # 방사선사
        "rn": "799001",  # 간호사
        "an": "799002"   # 간호조무사
    }

    for i, idx in enumerate(index_list):
        if idx >= len(df):
            raise IndexError(f"index {idx}가 유효하지 않습니다. 직원 수: {len(df)}")

        row = df.iloc[idx]

        # 입/퇴사 구분 및 날짜
        leave_raw = row["퇴사일"]
        if pd.isna(leave_raw) or str(leave_raw).strip() == "":
            type_text = "추가"
            d = datetime.today() + timedelta(days=2)
            if d.weekday() == 5:      # 토요일
                d += timedelta(days=2)
            elif d.weekday() == 6:    # 일요일
                d += timedelta(days=1)
            date_text = d.strftime("%y.%m.%d")
        else:
            type_text = "퇴사"
            date_text = str(leave_raw)[2:].replace("-", ".")

        # 항목 입력
        hwp.PutFieldText(f"type{i+1}", type_text)
        hwp.PutFieldText(f"name{i+1}", row["이름"])
        hwp.PutFieldText(f"idnum{i+1}", row["주민등록번호"].replace("-", " - "))
        hwp.PutFieldText(f"start_end_day{i+1}", date_text)
        hwp.PutFieldText(f"jobnum{i+1}", job_code_map.get(row["직종"], "000000"))
        hwp.PutFieldText(f"depart{i+1}", row["부서"])
        hwp.PutFieldText(f"check{i+1}", "V")

    # 작성일자 입력
    today = datetime.today()
    hwp.PutFieldText("make_year", today.strftime("%Y"))
    hwp.PutFieldText("make_month", str(int(today.strftime("%m"))))
    hwp.PutFieldText("make_day", str(int(today.strftime("%d"))))

    # 저장
    filename = f"TLD신상변동사항신청서_{today.strftime('%Y%m%d')}.hwp"
    save_path = os.path.join(save_dir, filename)
    hwp.SaveAs(save_path)
    print(f"TLD 신청서 작성 완료: {save_path}")
    print("SUCCESS")

except Exception as e:
    print(f"오류 발생: {e}")

finally:
    try:
        hwp.Quit()
    except:
        pass
